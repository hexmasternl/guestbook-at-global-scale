using HexMaster.Guestbook.Abstractions.DataTransferObjects;

namespace HexMaster.Guestbook.Api.Endpoints;

/// <summary>
/// Validates a <see cref="CreateGuestbookEntryRequest"/> for <c>POST /greet</c>.
/// Message must be non-empty. Latitude/longitude are optional — when omitted, the
/// server resolves an approximate location from the client's IP address instead —
/// but when supplied, both must be present together (not just one) and within valid
/// geographic ranges. Kept separate from the endpoint delegate so the rules can be
/// unit tested without a hosting environment.
/// </summary>
public static class CreateGuestbookEntryRequestValidator
{
    /// <summary>
    /// Validates <paramref name="request"/>, returning <c>true</c> with no errors
    /// when valid, or <c>false</c> with a field-keyed error dictionary otherwise.
    /// </summary>
    public static bool TryValidate(CreateGuestbookEntryRequest request, out IDictionary<string, string[]> errors)
    {
        var validationErrors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Message))
            validationErrors["message"] = ["Message must not be empty."];

        if (request.Lat is null != request.Lng is null)
        {
            validationErrors["lat"] = ["Lat and Lng must both be present, or both omitted."];
            validationErrors["lng"] = ["Lat and Lng must both be present, or both omitted."];
        }
        else
        {
            if (request.Lat is < -90 or > 90)
                validationErrors["lat"] = ["Lat must be between -90 and 90."];

            if (request.Lng is < -180 or > 180)
                validationErrors["lng"] = ["Lng must be between -180 and 180."];
        }

        errors = validationErrors;
        return validationErrors.Count == 0;
    }
}
