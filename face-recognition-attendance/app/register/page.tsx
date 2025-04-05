'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export default function RegisterStudent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    branch: '',
    year: '',
    roll_number: '',
    email: ''
  });

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
      
      console.log("Camera started successfully");
    } catch (err) {
      console.error("Error accessing webcam:", err);
      
      // Type guard to ensure err is an Error object
      const error = err as Error;
      
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

  const captureImage = () => {
    if (!videoRef.current || !isStreaming) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImages(prev => [...prev, imageData]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { name, branch, year, roll_number, email } = formData;
    if (!name || !branch || !year || !roll_number || !email) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return false;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return false;
    }
    
    if (capturedImages.length < 3) {
      setMessage({ type: 'error', text: 'Please capture at least 3 images' });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsProcessing(true);
    setMessage(null);
    
    try {
      // Step 1: Create student in Supabase
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert([{
          name: formData.name,
          branch: formData.branch,
          year: parseInt(formData.year),
          roll_number: formData.roll_number,
          email: formData.email
        }])
        .select();
      
      if (studentError) throw studentError;
      
      // Step 2: Register face images with AWS Rekognition
      let successCount = 0;
      
      for (const image of capturedImages) {
        const response = await fetch(`${API_BASE_URL}/register-face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: image,
            roll_number: formData.roll_number
          })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
          successCount++;
        }
      }
      
      setMessage({ 
        type: 'success', 
        text: `Student registered successfully with ${successCount} face images!` 
      });
      
      // Reset form
      setFormData({
        name: '',
        branch: '',
        year: '',
        roll_number: '',
        email: ''
      });
      setCapturedImages([]);
      stopStream();
      
    } catch (error: any) {
      console.error("Error registering student:", error);
      setMessage({ 
        type: 'error', 
        text: `Error registering student: ${error.message || 'Unknown error'}` 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Register New Student</h1>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Branch</label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="Computer Science"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Year</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Roll Number</label>
              <input
                type="text"
                name="roll_number"
                value={formData.roll_number}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="CS12345"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                placeholder="john.doe@example.com"
              />
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Face Registration</h3>
            <p className="text-gray-600 mb-4">
              Capture at least 3 images from different angles for better recognition.
            </p>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                {isStreaming ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded border"
                      style={{ height: '240px', objectFit: 'cover' }}
                    ></video>
                    
                    <div className="mt-2 flex space-x-2">
                      <button
                        type="button"
                        onClick={captureImage}
                        className="bg-blue-600 text-white py-1 px-3 rounded text-sm"
                        disabled={isProcessing}
                      >
                        Capture
                      </button>
                      <button
                        type="button"
                        onClick={stopStream}
                        className="bg-gray-600 text-white py-1 px-3 rounded text-sm"
                        disabled={isProcessing}
                      >
                        Stop Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded p-4 text-center bg-gray-100" style={{ height: '240px' }}>
                    <div className="flex h-full items-center justify-center">
                      <button
                        type="button"
                        onClick={startStream}
                        className="bg-green-600 text-white py-2 px-4 rounded"
                        disabled={isProcessing}
                      >
                        Start Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="border rounded p-4 bg-gray-50" style={{ height: '240px', overflowY: 'auto' }}>
                  <h4 className="text-sm font-medium mb-2">Captured Images ({capturedImages.length})</h4>
                  
                  {capturedImages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No images captured yet
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {capturedImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img src={img} alt={`Capture ${idx+1}`} className="rounded border" />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            onClick={() => setCapturedImages(prev => prev.filter((_, i) => i !== idx))}
                            disabled={isProcessing}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="submit"
              className="bg-green-600 text-white py-2 px-6 rounded hover:bg-green-700"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}