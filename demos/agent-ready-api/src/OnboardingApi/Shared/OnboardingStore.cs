using System.Security.Cryptography;

namespace OnboardingApi.Shared;

/// <summary>
/// In-memory store, good enough for a demo and for tests. Every read filters by tenant:
/// one client never sees another client's requests, not even to learn that they exist.
/// </summary>
public class OnboardingStore(TimeProvider clock)
{
    private readonly Lock _gate = new();
    private readonly List<OnboardingRequest> _requests = [];
    private readonly List<PlanChangeRequest> _planChanges = [];
    private int _lastNumber;

    public virtual OnboardingRequest Create(string tenantId, string legalName, string taxId, Plan plan, DateOnly startDate, string email)
    {
        lock (_gate)
        {
            var request = new OnboardingRequest
            {
                Number = ++_lastNumber,
                PublicId = NewId("onb"),
                TenantId = tenantId,
                CustomerLegalName = legalName,
                CustomerTaxId = taxId,
                Plan = plan,
                StartDate = startDate,
                ContactEmail = email,
                CreatedAt = clock.GetUtcNow(),
            };
            _requests.Add(request);
            return request;
        }
    }

    public IReadOnlyList<OnboardingRequest> List(string tenantId)
    {
        lock (_gate) return _requests.Where(r => r.TenantId == tenantId).ToList();
    }

    public OnboardingRequest? FindByNumber(string tenantId, int number)
    {
        lock (_gate) return _requests.FirstOrDefault(r => r.TenantId == tenantId && r.Number == number);
    }

    public OnboardingRequest? FindById(string tenantId, string publicId)
    {
        lock (_gate) return _requests.FirstOrDefault(r => r.TenantId == tenantId && r.PublicId == publicId);
    }

    public PlanChangeRequest AddPlanChange(string tenantId, string onboardingRequestId, Plan plan, string reason)
    {
        lock (_gate)
        {
            var change = new PlanChangeRequest
            {
                PublicId = NewId("pcr"),
                TenantId = tenantId,
                OnboardingRequestId = onboardingRequestId,
                RequestedPlan = plan,
                Reason = reason,
                CreatedAt = clock.GetUtcNow(),
            };
            _planChanges.Add(change);
            return change;
        }
    }

    public PlanChangeRequest? FindPlanChange(string tenantId, string publicId)
    {
        lock (_gate) return _planChanges.FirstOrDefault(c => c.TenantId == tenantId && c.PublicId == publicId);
    }

    public IReadOnlyList<PlanChangeRequest> ListPlanChanges(string tenantId)
    {
        lock (_gate) return _planChanges.Where(c => c.TenantId == tenantId).ToList();
    }

    private static string NewId(string prefix) =>
        $"{prefix}_{Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(5))}";
}
