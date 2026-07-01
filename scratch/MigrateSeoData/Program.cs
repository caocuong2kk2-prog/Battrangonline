using System;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;

class Program
{
    static async Task Main(string[] args)
    {
        string oldDbConnStr = "Server=(localdb)\\mssqllocaldb;Database=BattrangOnlineVN;Trusted_Connection=True;TrustServerCertificate=True";
        string newDbConnStr = "Server=(localdb)\\mssqllocaldb;Database=BatTrangDb;Trusted_Connection=True;TrustServerCertificate=True";

        try
        {
            using var oldConn = new SqlConnection(oldDbConnStr);
            using var newConn = new SqlConnection(newDbConnStr);
            await oldConn.OpenAsync();
            await newConn.OpenAsync();

            // Let's first check the column name in old db
            var oldCmd = new SqlCommand("SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('products')", oldConn);
            using var reader1 = await oldCmd.ExecuteReaderAsync();
            string nameCol = "Name";
            bool hasProductName = false;
            bool hasTitle = false;
            while (await reader1.ReadAsync())
            {
                var col = reader1.GetString(0).ToLower();
                if (col == "product_name") hasProductName = true;
                if (col == "title") hasTitle = true;
            }
            await reader1.CloseAsync();

            nameCol = hasProductName ? "product_name" : (hasTitle ? "title" : "name");

            Console.WriteLine($"Using name column: {nameCol} for matching.");

            // Now read the data
            var getCmd = new SqlCommand($"SELECT {nameCol}, product_meta_description FROM products WHERE product_meta_description IS NOT NULL AND CAST(product_meta_description as nvarchar(max)) != ''", oldConn);
            using var reader = await getCmd.ExecuteReaderAsync();

            int updatedCount = 0;
            while (await reader.ReadAsync())
            {
                var productName = reader.GetString(0);
                var metaDesc = reader.GetString(1);

                var updateCmd = new SqlCommand("UPDATE Products SET MetaDescription = @metaDesc WHERE Name = @name", newConn);
                updateCmd.Parameters.AddWithValue("@metaDesc", metaDesc);
                updateCmd.Parameters.AddWithValue("@name", productName);
                int rows = await updateCmd.ExecuteNonQueryAsync();
                if (rows > 0)
                {
                    updatedCount += rows;
                    Console.WriteLine($"Updated: {productName}");
                }
            }
            Console.WriteLine($"Done! Total products updated: {updatedCount}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }
}
