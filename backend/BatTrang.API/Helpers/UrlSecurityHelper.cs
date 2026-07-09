using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Threading.Tasks;
using System.Threading;

namespace BatTrang.API.Helpers
{
    public static class UrlSecurityHelper
    {
        private static readonly HttpClient _safeClient;

        static UrlSecurityHelper()
        {
            var handler = new SocketsHttpHandler
            {
                AllowAutoRedirect = false,
                ConnectCallback = async (context, cancellationToken) =>
                {
                    var host = context.DnsEndPoint.Host;
                    
                    if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase))
                    {
                        throw new HttpRequestException("Access to localhost is blocked.");
                    }

                    var addresses = await Dns.GetHostAddressesAsync(host, cancellationToken);
                    if (addresses.Length == 0)
                    {
                        throw new HttpRequestException("Could not resolve host.");
                    }

                    if (addresses.Any(IsPrivateOrLocalAddress))
                    {
                        throw new HttpRequestException("Access to private IP is blocked.");
                    }

                    var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
                    try
                    {
                        // Connect directly to the resolved safe IP address
                        await socket.ConnectAsync(new IPEndPoint(addresses[0], context.DnsEndPoint.Port), cancellationToken);
                        return new NetworkStream(socket, ownsSocket: true);
                    }
                    catch
                    {
                        socket.Dispose();
                        throw;
                    }
                }
            };
            
            _safeClient = new HttpClient(handler)
            {
                Timeout = TimeSpan.FromSeconds(15)
            };
        }

        public static async Task<bool> IsSafeExternalUrlAsync(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return false;
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
            if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return false;
            if (!string.IsNullOrEmpty(uri.UserInfo)) return false;
            return !await IsBlockedHostAsync(uri.Host);
        }

        public static async Task<bool> IsBlockedHostAsync(string host)
        {
            if (string.IsNullOrWhiteSpace(host)) return true;
            if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase)) return true;
            try
            {
                var addresses = await Dns.GetHostAddressesAsync(host);
                return addresses.Any(IsPrivateOrLocalAddress);
            }
            catch
            {
                return true;
            }
        }

        private static bool IsPrivateOrLocalAddress(IPAddress address)
        {
            if (IPAddress.IsLoopback(address)) return true;
            if (address.Equals(IPAddress.Any) || address.Equals(IPAddress.IPv6Any)) return true;

            if (address.AddressFamily == AddressFamily.InterNetwork)
            {
                var bytes = address.GetAddressBytes();
                return bytes[0] == 10 ||
                       bytes[0] == 127 ||
                       (bytes[0] == 169 && bytes[1] == 254) ||
                       (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) ||
                       (bytes[0] == 192 && bytes[1] == 168);
            }

            if (address.AddressFamily == AddressFamily.InterNetworkV6)
            {
                return address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || address.IsIPv6Multicast;
            }

            return true;
        }

        public static async Task<HttpResponseMessage?> FetchSafeExternalResponseAsync(
            HttpClient client,
            string url,
            HttpCompletionOption completionOption = HttpCompletionOption.ResponseHeadersRead,
            int maxRedirects = 5)
        {
            string currentUrl = url;
            for (int i = 0; i < maxRedirects; i++)
            {
                if (string.IsNullOrWhiteSpace(currentUrl)) return null;
                if (!Uri.TryCreate(currentUrl, UriKind.Absolute, out var uri)) return null;
                if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return null;
                if (!string.IsNullOrEmpty(uri.UserInfo)) return null;

                var request = new HttpRequestMessage(HttpMethod.Get, currentUrl);
                
                HttpResponseMessage response;
                try
                {
                    // Use the built-in safe client which protects against DNS rebinding
                    response = await _safeClient.SendAsync(request, completionOption);
                }
                catch
                {
                    return null;
                }

                if ((int)response.StatusCode >= 300 && (int)response.StatusCode <= 399 && response.Headers.Location != null)
                {
                    var nextUrl = response.Headers.Location.IsAbsoluteUri
                        ? response.Headers.Location.ToString()
                        : new Uri(new Uri(currentUrl), response.Headers.Location).ToString();

                    response.Dispose();
                    currentUrl = nextUrl;
                    continue;
                }

                return response;
            }

            return null;
        }
    }
}
