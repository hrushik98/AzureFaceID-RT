"use client"

import { forwardRef, useCallback, useEffect, useRef, useState } from "react"

interface WebcamProps {
  audio?: boolean
  screenshotFormat?: string
  width?: number
  height?: number
  videoConstraints?: MediaTrackConstraints
  className?: string
}

export const Webcam = forwardRef<any, WebcamProps>(
  (
    {
      audio = false,
      screenshotFormat = "image/webp",
      width = 640,
      height = 480,
      videoConstraints,
      className,
      ...props
    },
    ref,
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)

    const getScreenshot = useCallback(() => {
      if (!videoRef.current) return null

      const video = videoRef.current
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0)
      }
      const dataUrl = canvas.toDataURL(screenshotFormat)
      return dataUrl
    }, [screenshotFormat])

    // Expose the getScreenshot method via ref
    useEffect(() => {
      if (ref) {
        if (typeof ref === "function") {
          ref({ getScreenshot })
        } else {
          ref.current = { getScreenshot }
        }
      }
    }, [ref, getScreenshot])

    // Initialize webcam
    useEffect(() => {
      const constraints: MediaStreamConstraints = {
        audio,
        video: videoConstraints || {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: "user",
        },
      }

      const enableStream = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints)
          setStream(stream)
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        } catch (err) {
          console.error("Error accessing webcam:", err)
        }
      }

      enableStream()

      return () => {
        if (stream) {
          stream.getTracks().forEach((track) => {
            track.stop()
          })
        }
      }
    }, [audio, height, videoConstraints, width])

    return (
      <video ref={videoRef} autoPlay playsInline muted className={className} width={width} height={height} {...props} />
    )
  },
)

Webcam.displayName = "Webcam"

