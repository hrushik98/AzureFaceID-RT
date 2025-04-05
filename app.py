import os
import sys
import time
import cv2
import boto3
import pandas as pd
import base64
import json
import io
import numpy as np
import requests
from datetime import datetime
from botocore.exceptions import ClientError
from PIL import Image
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# AWS Rekognition Configuration
aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
aws_region = os.getenv("AWS_REGION", "us-east-1")  # Default to us-east-1 if not specified

# Collection for face storage
collection_id = os.getenv("COLLECTION_ID", "attendance_collection")

# Supabase Configuration
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

# Initialize AWS Rekognition client with credentials
rekognition = boto3.client(
    'rekognition',
    region_name=aws_region,
    aws_access_key_id=aws_access_key_id,
    aws_secret_access_key=aws_secret_access_key
)

# Supabase Functions

def supabase_request(method, endpoint, data=None, params=None):
    url = f"{supabase_url}{endpoint}"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    if method == "GET":
        response = requests.get(url, headers=headers, params=params)
    elif method == "POST":
        response = requests.post(url, headers=headers, json=data)
    elif method == "PUT":
        response = requests.put(url, headers=headers, json=data)
    elif method == "DELETE":
        response = requests.delete(url, headers=headers, params=params)
    
    if response.status_code >= 400:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None
    
    try:
        return response.json()
    except:
        return response.text

def get_students():
    return supabase_request("GET", "/rest/v1/students?select=*")

def get_student_by_id(student_id):
    return supabase_request("GET", f"/rest/v1/students?id=eq.{student_id}&select=*")

def get_student_by_roll_number(roll_number):
    return supabase_request("GET", f"/rest/v1/students?roll_number=eq.{roll_number}&select=*")

def create_student(name, branch, year, roll_number, email):
    data = {
        "name": name,
        "branch": branch,
        "year": year,
        "roll_number": roll_number,
        "email": email
    }
    return supabase_request("POST", "/rest/v1/students", data)

def record_attendance(student_id, confidence):
    data = {
        "student_id": student_id,
        "confidence": confidence
    }
    return supabase_request("POST", "/rest/v1/attendance", data)

def get_attendance_records(limit=50):
    return supabase_request("GET", f"/rest/v1/attendance_with_student?select=*&limit={limit}")

# AWS Rekognition Functions

def create_collection(collection_id):
    try:
        # Check if collection already exists
        response = rekognition.list_collections()
        if collection_id in response['CollectionIds']:
            print(f"Collection '{collection_id}' already exists.")
            return {"status": "success", "message": f"Collection '{collection_id}' already exists."}
        
        # Create a new collection
        response = rekognition.create_collection(CollectionId=collection_id)
        print(f"Collection '{collection_id}' created. ARN: {response['CollectionArn']}")
        return {"status": "success", "message": f"Collection '{collection_id}' created."}
    
    except ClientError as e:
        print(f"Error creating collection: {e}")
        return {"status": "error", "message": str(e)}

def delete_collection(collection_id):
    try:
        response = rekognition.delete_collection(CollectionId=collection_id)
        print(f"Collection '{collection_id}' deleted.")
        return {"status": "success", "message": f"Collection '{collection_id}' deleted."}
    
    except ClientError as e:
        print(f"Error deleting collection: {e}")
        return {"status": "error", "message": str(e)}

def index_faces_from_base64(collection_id, image_base64, external_id=None):
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_base64)
        
        response = rekognition.index_faces(
            CollectionId=collection_id,
            Image={'Bytes': image_bytes},
            ExternalImageId=external_id if external_id else "unknown",
            DetectionAttributes=['ALL']
        )
        
        face_records = response['FaceRecords']
        
        if face_records:
            print(f"Added {len(face_records)} face(s) to collection '{collection_id}'")
            for face_record in face_records:
                face_id = face_record['Face']['FaceId']
                print(f"Face ID: {face_id}")
            return {
                "status": "success", 
                "face_ids": [record['Face']['FaceId'] for record in face_records],
                "count": len(face_records)
            }
        else:
            print("No faces detected in the image.")
            return {"status": "error", "message": "No faces detected in the image."}
    
    except ClientError as e:
        print(f"Error indexing face: {e}")
        return {"status": "error", "message": str(e)}

def search_faces_from_base64(collection_id, image_base64, threshold=80):
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_base64)
        
        response = rekognition.search_faces_by_image(
            CollectionId=collection_id,
            Image={'Bytes': image_bytes},
            FaceMatchThreshold=threshold,
            MaxFaces=5
        )
        
        face_matches = response['FaceMatches']
        
        if face_matches:
            print(f"Found {len(face_matches)} match(es)")
            return {
                "status": "success",
                "matches": [
                    {
                        "face_id": match['Face']['FaceId'],
                        "similarity": match['Similarity'],
                        "external_id": match['Face'].get('ExternalImageId', 'unknown')
                    }
                    for match in face_matches
                ]
            }
        else:
            print("No matching faces found in the collection.")
            return {"status": "error", "message": "No matching faces found in the collection."}
    
    except ClientError as e:
        if 'InvalidParameterException' in str(e) and 'No face detected' in str(e):
            print("No faces detected in the input image.")
            return {"status": "error", "message": "No faces detected in the input image."}
        else:
            print(f"Error searching for faces: {e}")
            return {"status": "error", "message": str(e)}

def delete_faces(collection_id, face_ids):
    try:
        response = rekognition.delete_faces(
            CollectionId=collection_id,
            FaceIds=face_ids
        )
        
        deleted_faces = response.get('DeletedFaces', [])
        print(f"Deleted {len(deleted_faces)} face(s).")
        return {"status": "success", "deleted": deleted_faces}
    
    except ClientError as e:
        print(f"Error deleting faces: {e}")
        return {"status": "error", "message": str(e)}

# API Endpoints for Flask

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/api/students', methods=['GET'])
def api_get_students():
    students = get_students()
    return jsonify(students)

@app.route('/api/students', methods=['POST'])
def api_create_student():
    data = request.json
    required_fields = ['name', 'branch', 'year', 'roll_number', 'email']
    
    for field in required_fields:
        if field not in data:
            return jsonify({"status": "error", "message": f"Missing required field: {field}"}), 400
    
    result = create_student(
        data['name'], 
        data['branch'], 
        data['year'], 
        data['roll_number'], 
        data['email']
    )
    
    if result:
        return jsonify({"status": "success", "data": result})
    else:
        return jsonify({"status": "error", "message": "Failed to create student"}), 500

@app.route('/api/register-face', methods=['POST'])
def api_register_face():
    data = request.json
    
    if 'image' not in data or 'roll_number' not in data:
        return jsonify({"status": "error", "message": "Missing image or roll_number"}), 400
    
    # Get student by roll number
    student = get_student_by_roll_number(data['roll_number'])
    
    if not student or len(student) == 0:
        return jsonify({"status": "error", "message": "Student not found"}), 404
    
    student = student[0]
    
    # Create collection if it doesn't exist
    create_collection(collection_id)
    
    # Register face
    result = index_faces_from_base64(
        collection_id,
        data['image'].split(',')[1] if ',' in data['image'] else data['image'],
        external_id=student['id']
    )
    
    return jsonify(result)

@app.route('/api/recognize-face', methods=['POST'])
def api_recognize_face():
    data = request.json
    
    if 'image' not in data:
        return jsonify({"status": "error", "message": "Missing image"}), 400
    
    # Search for face
    result = search_faces_from_base64(
        collection_id,
        data['image'].split(',')[1] if ',' in data['image'] else data['image']
    )
    
    if result['status'] == 'success' and result['matches']:
        match = result['matches'][0]
        student_id = match['external_id']
        
        # Get student details
        student = get_student_by_id(student_id)
        
        if student and len(student) > 0:
            student = student[0]
            
            # Record attendance
            record_attendance(student_id, match['similarity'])
            
            return jsonify({
                "status": "success",
                "match": match,
                "student": student
            })
    
    return jsonify(result)

@app.route('/api/attendance', methods=['GET'])
def api_get_attendance():
    limit = request.args.get('limit', 50)
    attendance = get_attendance_records(limit)
    return jsonify(attendance)

if __name__ == '__main__':
    # Ensure the collection exists
    create_collection(collection_id)
    app.run(host='0.0.0.0', port=5000, debug=True)