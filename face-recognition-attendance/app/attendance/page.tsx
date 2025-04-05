'use client';

import { useState, useRef, useEffect } from 'react';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

type Student = {
  id: string;
  name: string;
  branch: string;
  year: number;
  roll_number: string;
  email: string;
};

type RecognitionResult = {
  student: Student;
  similarity: number;
};

export default function TakeAttendance() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  
  useEffect(() => {
    return () => {
      // Cleanup function to stop the stream when component unmounts
      stopStream();
    };
  }, []);

  const startStream = async () => {
    try {
      // First, we'll check if any old stream needs cleaning up
      stopStream();
      
      // Try to get the media stream with more specific constraints
      // We'll explicitly request a camera and higher resolution
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'  // Prefer front camera
        },
        audio: false
      });
      
      // Store the stream reference
      streamRef.current = stream;
      
      // Apply the stream to the video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Add event listener to ensure video is playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            console.error("Error playing video:", e);
            setMessage({ type: 'error', text: 'Error playing video stream. Please refresh and try again.' });
          });
        };
      }
      
      setIsStreaming(true);
      setMessage(null);
      setRecognitionResult(null);
      
      console.log("Camera started successfully");
    } catch (err) {
      console.error("Error accessing webcam:", err);
      
      // Type assertion to access error properties
      const error = err as { name?: string; message?: string };
      
      // More specific error message based on the error
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMessage({ type: 'error', text: 'Camera access denied. Please allow camera access in your browser settings.' });
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setMessage({ type: 'error', text: 'No camera found. Please ensure your camera is connected and not in use by another application.' });
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setMessage({ type: 'error', text: 'Camera is already in use by another application. Please close other applications using the camera.' });
      } else {
        setMessage({ type: 'error', text: `Error accessing webcam: ${error.message || 'Unknown error'}. Try refreshing the page.` });
      }
    }
  };

  const stopStream = () => {
    // Clean up any existing stream
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log("Track stopped:", track.kind);
        });
        streamRef.current = null;
      } catch (err) {
        console.error("Error stopping tracks:", err);
      }
    }
    
    // Clear the video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !isStreaming) return;
    
    setIsProcessing(true);
    setMessage(null);
    setRecognitionResult(null);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');
      
      ctx.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg');
      
      // Send image to backend for recognition
      const response = await fetch(`${API_BASE_URL}/recognize-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });
      
      const result = await response.json();
      
      if (result.status === 'success' && result.student) {
        setRecognitionResult({
          student: result.student,
          similarity: result.match.similarity
        });
        setMessage({ type: 'success', text: `Attendance recorded for ${result.student.name}!` });
      } else {
        setMessage({ type: 'error', text: result.message || 'No matching face found' });
      }
    } catch (error: any) {
      console.error("Error recognizing face:", error);
      setMessage({ type: 'error', text: `Error: ${error.message || 'Recognition failed'}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Take Attendance</h1>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4">Camera Feed</h3>
            
            {isStreaming ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded border"
                  style={{ height: '300px', objectFit: 'cover' }}
                ></video>
                
                <div className="mt-4 flex space-x-2">
                  <button
                    type="button"
                    onClick={captureAndRecognize}
                    className="bg-blue-600 text-white py-2 px-4 rounded"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Recognize & Mark Attendance'}
                  </button>
                  <button
                    type="button"
                    onClick={stopStream}
                    className="bg-gray-600 text-white py-2 px-4 rounded"
                    disabled={isProcessing}
                  >
                    Stop Camera
                  </button>
                </div>
              </div>
            ) : (
              <div className="border rounded p-4 text-center bg-gray-100" style={{ height: '300px' }}>
                <div className="flex h-full items-center justify-center">
                  <button
                    type="button"
                    onClick={startStream}
                    className="bg-green-600 text-white py-2 px-4 rounded"
                  >
                    Start Camera
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4">Recognition Result</h3>
            
            {recognitionResult ? (
              <div className="border rounded p-6 bg-blue-50">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold">{recognitionResult.student.name}</h4>
                  <p className="text-gray-500">Similarity: {recognitionResult.similarity.toFixed(2)}%</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-semibold">Roll Number</p>
                    <p>{recognitionResult.student.roll_number}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Branch</p>
                    <p>{recognitionResult.student.branch}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Year</p>
                    <p>{recognitionResult.student.year}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="truncate">{recognitionResult.student.email}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-green-700 font-medium">
                    Attendance Recorded Successfully!
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="border rounded p-6 bg-gray-50 text-center" style={{ height: '300px' }}>
                <div className="flex flex-col h-full items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-500">
                    No recognition results yet. Start the camera and click "Recognize" to mark attendance.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}