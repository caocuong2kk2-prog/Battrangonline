using BatTrang.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Services
{
    /// <summary>
    /// Background service that periodically scans the uploads folder
    /// and removes orphaned files (files not referenced by any DB record).
    /// Runs every 24 hours by default. Also exposes a manual cleanup method.
    /// </summary>
    public class FileCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<FileCleanupService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromHours(24);

        // Files must be at least this old before being considered orphans.
        // This prevents deleting files that were just uploaded but not yet saved to DB.
        private static readonly TimeSpan OrphanAge = TimeSpan.FromHours(1);

        public FileCleanupService(IServiceScopeFactory scopeFactory, ILogger<FileCleanupService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[FileCleanup] Background service started. Interval: {Interval}h", _interval.TotalHours);

            // Wait a bit after startup before running the first cleanup
            await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var result = await RunCleanupAsync();
                    _logger.LogInformation(
                        "[FileCleanup] Completed. Scanned={Scanned}, Referenced={Referenced}, Orphans={Orphans}, Deleted={Deleted}, FreedBytes={Freed}",
                        result.TotalFiles, result.ReferencedFiles, result.OrphanFiles, result.DeletedFiles, result.FreedBytes);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[FileCleanup] Error during cleanup");
                }

                await Task.Delay(_interval, stoppingToken);
            }
        }

        /// <summary>
        /// Runs the cleanup process. Can be called manually via the admin endpoint.
        /// </summary>
        public async Task<CleanupResult> RunCleanupAsync(bool dryRun = false)
        {
            var result = new CleanupResult();

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadsFolder))
            {
                _logger.LogInformation("[FileCleanup] Uploads folder does not exist, skipping.");
                return result;
            }

            // 1. Collect all file URLs referenced in the database
            var referencedUrls = await GetAllReferencedUrlsAsync();

            // 2. Scan physical files
            var physicalFiles = Directory.GetFiles(uploadsFolder);
            result.TotalFiles = physicalFiles.Length;
            result.ReferencedFiles = 0;

            var orphans = new List<OrphanFileInfo>();

            foreach (var filePath in physicalFiles)
            {
                var fileName = Path.GetFileName(filePath);
                var fileUrl = $"/uploads/{fileName}";

                if (referencedUrls.Contains(fileUrl))
                {
                    result.ReferencedFiles++;
                    continue;
                }

                // Check file age — don't delete recently uploaded files
                var fileInfo = new FileInfo(filePath);
                var fileAge = DateTime.UtcNow - fileInfo.CreationTimeUtc;
                if (fileAge < OrphanAge)
                {
                    continue; // Too new, might still be in-progress
                }

                orphans.Add(new OrphanFileInfo
                {
                    FilePath = filePath,
                    FileUrl = fileUrl,
                    FileName = fileName,
                    SizeBytes = fileInfo.Length,
                    CreatedAt = fileInfo.CreationTimeUtc
                });
            }

            result.OrphanFiles = orphans.Count;
            result.OrphanDetails = orphans.Select(o => new OrphanFileDetail
            {
                FileName = o.FileName,
                FileUrl = o.FileUrl,
                SizeBytes = o.SizeBytes,
                CreatedAt = o.CreatedAt
            }).ToList();

            // 3. Delete orphans (unless dry run)
            if (!dryRun)
            {
                foreach (var orphan in orphans)
                {
                    try
                    {
                        File.Delete(orphan.FilePath);
                        result.DeletedFiles++;
                        result.FreedBytes += orphan.SizeBytes;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[FileCleanup] Failed to delete: {File}", orphan.FileName);
                    }
                }
            }
            else
            {
                result.FreedBytes = orphans.Sum(o => o.SizeBytes);
            }

            return result;
        }

        /// <summary>
        /// Queries all database tables to find every file URL referenced in the system.
        /// </summary>
        private async Task<HashSet<string>> GetAllReferencedUrlsAsync()
        {
            var urls = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // 1. ProductImages — the main source of product images
            var productImageUrls = await context.ProductImages
                .Select(pi => pi.ImageUrl)
                .ToListAsync();
            foreach (var url in productImageUrls)
                if (!string.IsNullOrEmpty(url)) urls.Add(url);

            // 2. Categories — Icon field
            var categoryIcons = await context.Categories
                .Where(c => c.Icon != null)
                .Select(c => c.Icon!)
                .ToListAsync();
            foreach (var url in categoryIcons)
                if (!string.IsNullOrEmpty(url)) urls.Add(url);

            // 3. JourneyVideos — Url and Thumbnail fields
            var journeyData = await context.JourneyVideos
                .Select(v => new { v.Url, v.Thumbnail })
                .ToListAsync();
            foreach (var v in journeyData)
            {
                if (!string.IsNullOrEmpty(v.Url)) urls.Add(v.Url);
                if (!string.IsNullOrEmpty(v.Thumbnail)) urls.Add(v.Thumbnail);
            }

            // 4. SiteConfig — values that look like upload URLs
            var siteConfigValues = await context.SiteConfigs
                .Select(s => s.Value)
                .ToListAsync();
            foreach (var val in siteConfigValues)
            {
                if (!string.IsNullOrEmpty(val) && val.StartsWith("/uploads/"))
                    urls.Add(val);
            }

            return urls;
        }

        private class OrphanFileInfo
        {
            public string FilePath { get; set; } = "";
            public string FileUrl { get; set; } = "";
            public string FileName { get; set; } = "";
            public long SizeBytes { get; set; }
            public DateTime CreatedAt { get; set; }
        }
    }

    /// <summary>
    /// Result of a cleanup operation.
    /// </summary>
    public class CleanupResult
    {
        public int TotalFiles { get; set; }
        public int ReferencedFiles { get; set; }
        public int OrphanFiles { get; set; }
        public int DeletedFiles { get; set; }
        public long FreedBytes { get; set; }
        public string FreedFormatted => FormatBytes(FreedBytes);
        public List<OrphanFileDetail> OrphanDetails { get; set; } = new();

        private static string FormatBytes(long bytes)
        {
            if (bytes < 1024) return $"{bytes} B";
            if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} KB";
            return $"{bytes / (1024.0 * 1024.0):F1} MB";
        }
    }

    public class OrphanFileDetail
    {
        public string FileName { get; set; } = "";
        public string FileUrl { get; set; } = "";
        public long SizeBytes { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
