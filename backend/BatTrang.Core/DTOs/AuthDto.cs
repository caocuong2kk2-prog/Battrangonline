namespace BatTrang.Core.DTOs
{
    public class LoginRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Username { get; set; } = null!;
        public string Role { get; set; } = "admin";
    }
}
