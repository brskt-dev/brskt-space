using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text.Json;

namespace OnboardingApi.V2;

/// <summary>
/// Remembers what happened for each (tenant, operation, Idempotency-Key).
/// In memory here; in production this record must be durable and written in the same
/// transaction as the effect (for example a unique index on TenantId + Operation + Key).
/// </summary>
public sealed class IdempotencyStore(TimeProvider clock)
{
    public static readonly TimeSpan Retention = TimeSpan.FromHours(24);

    private readonly ConcurrentDictionary<(string Tenant, string Operation, string Key), Entry> _entries = new();

    public sealed class Entry(string fingerprint, DateTimeOffset createdAt)
    {
        public string Fingerprint { get; } = fingerprint;
        public DateTimeOffset CreatedAt { get; } = createdAt;
        public bool Completed { get; private set; }
        public int StatusCode { get; private set; }
        public string? Location { get; private set; }
        public object? Body { get; private set; }

        public void Complete(int statusCode, string? location, object body)
        {
            (StatusCode, Location, Body) = (statusCode, location, body);
            Completed = true;
        }
    }

    public abstract record Outcome
    {
        /// <summary>First time this key is seen: do the work, then call Complete.</summary>
        public sealed record Started(Entry Entry) : Outcome;
        /// <summary>Same key, same request, already done: send the stored response again.</summary>
        public sealed record Replay(Entry Entry) : Outcome;
        /// <summary>Same key, same request, still running: ask the client to wait.</summary>
        public sealed record InProgress : Outcome;
        /// <summary>Same key, different request: refuse, the client has a bug.</summary>
        public sealed record Mismatch : Outcome;
    }

    public Outcome Begin(string tenant, string operation, string key, string fingerprint)
    {
        var now = clock.GetUtcNow();
        var fresh = new Entry(fingerprint, now);
        var entry = _entries.AddOrUpdate(
            (tenant, operation, key),
            fresh,
            (_, existing) => now - existing.CreatedAt > Retention ? fresh : existing);

        if (ReferenceEquals(entry, fresh)) return new Outcome.Started(fresh);
        if (entry.Fingerprint != fingerprint) return new Outcome.Mismatch();
        return entry.Completed ? new Outcome.Replay(entry) : new Outcome.InProgress();
    }

    /// <summary>A failed attempt must not block the key forever.</summary>
    public void Forget(string tenant, string operation, string key) => _entries.TryRemove((tenant, operation, key), out _);

    public static string Fingerprint<T>(T body) =>
        Convert.ToHexStringLower(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(body)));
}
