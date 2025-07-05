export const formatViews = (viewCount: number | string | undefined) => {
  if (!viewCount) return "N/A";
  const count = typeof viewCount === "string" ? parseInt(viewCount) : viewCount;
  if (isNaN(count)) return "N/A";
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + "M";
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + "K";
  }
  return count.toLocaleString();
};

export const formatDate = (dateString: string | Date) => {
  return new Date(dateString).toUTCString();
};

export const formatDuration = (duration: string | undefined) => {
  if (!duration) return "N/A";

  // Handle ISO 8601 duration format (PT1H2M3S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
};

export const getMediumThumbnail = (thumbnails: any) => {
  if (!thumbnails) return "";
  return (
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    thumbnails.high?.url ||
    ""
  );
};
