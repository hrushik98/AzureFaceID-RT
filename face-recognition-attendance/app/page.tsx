import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Face Recognition Attendance System</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Welcome!</h2>
        <p className="mb-4">This application uses AWS Rekognition for facial recognition to automate the attendance process.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Register Students</h3>
            <p className="mb-4">Add new students to the system and capture their face data for recognition.</p>
            <Link href="/register" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 inline-block">
              Register Students
            </Link>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Take Attendance</h3>
            <p className="mb-4">Use the webcam to capture faces and automatically mark attendance.</p>
            <Link href="/attendance" className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 inline-block">
              Take Attendance
            </Link>
          </div>
        </div>
        
        <div className="mt-8 bg-gray-50 p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-2">View Attendance Records</h3>
          <p className="mb-4">Access historical attendance data and generate reports.</p>
          <Link href="/records" className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 inline-block">
            View Records
          </Link>
        </div>
      </div>
    </div>
  );
}