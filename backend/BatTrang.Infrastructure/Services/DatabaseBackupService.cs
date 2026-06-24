using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace BatTrang.Infrastructure.Services
{
    public class DatabaseBackupService : BackgroundService
    {
        private readonly ILogger<DatabaseBackupService> _logger;
        private readonly IConfiguration _configuration;

        public DatabaseBackupService(ILogger<DatabaseBackupService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[DatabaseBackup] Background service started. Performing initial startup backup...");
            
            // Run immediately on startup
            await PerformBackupAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var runAtHourStr = _configuration["BackupSettings:RunAtHour"];
                    if (!int.TryParse(runAtHourStr, out int runAtHour)) runAtHour = 2;
                    var now = DateTime.Now;
                    
                    // Tính thời gian tới lần chạy tiếp theo
                    var nextRunTime = new DateTime(now.Year, now.Month, now.Day, runAtHour, 0, 0);
                    
                    // Nếu thời gian chạy đã qua trong ngày hôm nay, lên lịch cho ngày mai
                    if (now >= nextRunTime)
                    {
                        nextRunTime = nextRunTime.AddDays(1);
                    }

                    var delay = nextRunTime - now;
                    _logger.LogInformation($"[DatabaseBackup] Next backup scheduled at: {nextRunTime} (in {delay.TotalHours:F2} hours)");

                    await Task.Delay(delay, stoppingToken);

                    if (!stoppingToken.IsCancellationRequested)
                    {
                        await PerformBackupAsync(stoppingToken);
                    }
                }
                catch (TaskCanceledException)
                {
                    // Ignore, service is stopping
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[DatabaseBackup] Error calculating next run time.");
                    await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken); // Thử lại sau 10 phút nếu có lỗi logic
                }
            }
        }

        public async Task PerformBackupAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("[DatabaseBackup] Starting backup process...");

                var backupFolder = _configuration["BackupSettings:BackupFolder"];
                if (string.IsNullOrEmpty(backupFolder))
                {
                    _logger.LogWarning("[DatabaseBackup] BackupFolder is not configured in appsettings.json. Skipping backup.");
                    return;
                }

                if (!Directory.Exists(backupFolder))
                {
                    Directory.CreateDirectory(backupFolder);
                    _logger.LogInformation($"[DatabaseBackup] Created backup directory: {backupFolder}");
                }

                var keepDaysStr = _configuration["BackupSettings:KeepDays"];
                if (!int.TryParse(keepDaysStr, out int keepDays)) keepDays = 7;
                CleanOldBackups(backupFolder, keepDays);

                var connectionString = _configuration.GetConnectionString("DefaultConnection");
                if (string.IsNullOrEmpty(connectionString))
                {
                    _logger.LogError("[DatabaseBackup] DefaultConnection string is null or empty.");
                    return;
                }

                // Lấy tên Database từ ConnectionString
                var builder = new SqlConnectionStringBuilder(connectionString);
                var databaseName = builder.InitialCatalog;

                if (string.IsNullOrEmpty(databaseName))
                {
                    _logger.LogError("[DatabaseBackup] Cannot determine InitialCatalog (Database Name) from connection string.");
                    return;
                }

                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var backupFileName = $"{databaseName}_{timestamp}.bak";
                var backupFilePath = Path.Combine(backupFolder, backupFileName);

                var backupQuery = $"BACKUP DATABASE [{databaseName}] TO DISK = '{backupFilePath}' WITH FORMAT, MEDIANAME = 'DBBackup', NAME = 'Full Backup';";

                using (var connection = new SqlConnection(connectionString))
                {
                    await connection.OpenAsync(cancellationToken);
                    using (var command = new SqlCommand(backupQuery, connection))
                    {
                        command.CommandTimeout = 3600; // 1 giờ timeout cho việc backup DB lớn
                        await command.ExecuteNonQueryAsync(cancellationToken);
                    }
                }

                _logger.LogInformation($"[DatabaseBackup] Successfully backed up database to: {backupFilePath}");
            }
            catch (SqlException sqlEx)
            {
                 _logger.LogError(sqlEx, "[DatabaseBackup] SQL Error during backup. Note: SQL Server (MSSQLSERVER service account) MUST have Write permissions to the destination folder.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[DatabaseBackup] Failed to backup database.");
            }
        }

        private void CleanOldBackups(string backupFolder, int keepDays)
        {
            try
            {
                var thresholdDate = DateTime.Now.AddDays(-keepDays);
                var files = Directory.GetFiles(backupFolder, "*.bak");
                int deletedCount = 0;

                foreach (var file in files)
                {
                    var fileInfo = new FileInfo(file);
                    if (fileInfo.CreationTime < thresholdDate)
                    {
                        fileInfo.Delete();
                        deletedCount++;
                        _logger.LogInformation($"[DatabaseBackup] Deleted old backup file: {fileInfo.Name}");
                    }
                }

                if (deletedCount > 0)
                {
                    _logger.LogInformation($"[DatabaseBackup] Cleanup completed. Deleted {deletedCount} old backup files.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[DatabaseBackup] Error while cleaning up old backups.");
            }
        }
    }
}
