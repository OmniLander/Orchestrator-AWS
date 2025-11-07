import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from Modules.EC2_MS.EC2_constants.EC2_verification import ec2_in_existance
from flask import Blueprint, render_template, request, redirect, url_for, Response, jsonify

EC2_controller_bp = Blueprint("EC2_controller_bp", __name__,
                           template_folder="../../../Models/EC2_MS_models/VPC_views",
                           static_folder="../../../Models/EC2_MS_models/VPC_styles")

@EC2_controller_bp.route('/EC2_in_existance', methods=['GET'])
def EC2_in_existance():
    try:
        EC2s = ec2_in_existance()
        return jsonify({"success": True, "data": EC2s})

    except Exception as e: 
        print(f"Unexpected error {e}")
        return jsonify({"Error": str(e)}), 500
    
    
    