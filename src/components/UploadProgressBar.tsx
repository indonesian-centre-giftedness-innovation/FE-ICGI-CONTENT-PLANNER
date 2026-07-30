export function UploadProgressBar({ percent }: { percent: number }) {
  return (
    <div className="upload-progress">
      <div className="upload-progress__track">
        <div className="upload-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="upload-progress__label">Mengunggah... {percent}%</span>
    </div>
  );
}