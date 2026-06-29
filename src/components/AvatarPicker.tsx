"use client"

import type { CSSProperties } from "react"
import { useCallback, useEffect, useRef, useState } from "react"

type AvatarPickerProps = {
  defaultValue: string
  fallback: string
  fallbackStyle: CSSProperties
}

export function AvatarPicker({ defaultValue, fallback, fallbackStyle }: AvatarPickerProps) {
  const [avatar, setAvatar] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    if (!open || !cameraOn) {
      stopCamera()
      return
    }

    let cancelled = false

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch(() => {
        setCameraError("Camera unavailable or permission denied.")
        setCameraOn(false)
      })

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [cameraOn, open, stopCamera])

  const close = () => {
    setOpen(false)
    setCameraOn(false)
    setCameraError("")
    stopCamera()
  }

  const onFileChange = (file: File | undefined) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const takePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return

    const canvas = document.createElement("canvas")
    const size = Math.min(video.videoWidth, video.videoHeight)
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2
    canvas.width = 480
    canvas.height = 480

    const context = canvas.getContext("2d")
    context?.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height)
    setAvatar(canvas.toDataURL("image/jpeg", 0.88))
    close()
  }

  const removeAvatar = () => {
    setAvatar("")
    close()
  }

  return (
    <div className="avatar-picker">
      <input name="avatarUrl" type="hidden" value={avatar} />
      <button className="avatar-picker-button" type="button" onClick={() => setOpen(true)}>
        <span className="avatar avatar-large" style={fallbackStyle}>{avatar ? <span aria-hidden className="avatar-image" style={{ backgroundImage: `url(${avatar})` }} /> : fallback}</span>
        <span>
          <strong>Profile photo</strong>
          <small className="subtle">Upload from device or take a photo</small>
        </span>
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation" onClick={close}>
          <section aria-modal="true" className="modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">Avatar</p>
                <h2>Choose a profile photo</h2>
              </div>
              <button aria-label="Close" className="icon-button" type="button" onClick={close}>
                x
              </button>
            </div>

            <div className="avatar-preview">
              <span className="avatar avatar-xl" style={fallbackStyle}>{avatar ? <span aria-hidden className="avatar-image" style={{ backgroundImage: `url(${avatar})` }} /> : fallback}</span>
            </div>

            <div className="grid two">
              <label className="button secondary full">
                Upload image
                <input accept="image/*" hidden type="file" onChange={(event) => onFileChange(event.target.files?.[0])} />
              </label>
              <button className="button secondary full" type="button" onClick={() => setCameraOn((value) => !value)}>
                {cameraOn ? "Stop camera" : "Use camera"}
              </button>
            </div>

            {cameraError ? <p className="pill gold">{cameraError}</p> : null}

            {cameraOn ? (
              <div className="camera-box">
                <video ref={videoRef} autoPlay muted playsInline />
                <button className="button success full" type="button" onClick={takePhoto}>
                  Take photo
                </button>
              </div>
            ) : null}

            <div className="modal-actions">
              <button className="button secondary" type="button" onClick={removeAvatar}>
                Remove
              </button>
              <button className="button" type="button" onClick={close}>
                Done
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
