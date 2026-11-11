/** Start playback in the same user-gesture chain as getUserMedia when possible (iOS Safari). */
export async function primeVideoPlayback(stream: MediaStream): Promise<void> {
  if (typeof document === 'undefined') return;
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', 'true');
  video.srcObject = stream;
  try {
    await video.play();
  } catch {
    // CameraView will retry when the element mounts.
  }
  video.srcObject = null;
}

export function attachVideoStream(video: HTMLVideoElement, stream: MediaStream | null): void {
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', 'true');
  video.autoplay = true;
  video.srcObject = stream;
  if (!stream) return;
  void video.play().catch(() => {});
}
