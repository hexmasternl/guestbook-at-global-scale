namespace HexMaster.Guestbook.Services;

public interface IGuestbookRegionProvider
{
    /// <summary>Azure region this backend instance is running in, e.g. "westeurope".</summary>
    string GetCurrentRegion();
}
