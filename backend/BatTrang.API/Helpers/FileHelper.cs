using System.IO;

namespace BatTrang.API.Helpers
{
    public static class FileHelper
    {
        public static void DeletePhysicalFile(string fileUrl)
        {
            if (string.IsNullOrWhiteSpace(fileUrl)) return;

            // Only delete local uploads, ignore external URLs (e.g. facebook graph, http...)
            if (fileUrl.StartsWith("/uploads/"))
            {
                var fileName = fileUrl.Substring("/uploads/".Length);
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", fileName);
                
                if (File.Exists(filePath))
                {
                    try
                    {
                        File.Delete(filePath);
                    }
                    catch
                    {
                        // Ignore deletion errors (file in use, permission, etc.)
                    }
                }
            }
        }
    }
}
