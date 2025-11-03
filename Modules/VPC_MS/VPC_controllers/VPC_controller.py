import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from Modules.VPC_MS.VPC_Constants.VPC_Creation import create_vpc
from Modules.VPC_MS.VPC_Constants.VPC_elimination import delete_vpc
from Modules.VPC_MS.VPC_Constants.VPC_Verification import vpc_in_existance
from flask import Blueprint, render_template, request, redirect, url_for, Response, jsonify

VPC_controller_bp = Blueprint("VPC_controller_bp", __name__,
                           template_folder="../../../Models/VPC_MS_models/VPC_views",
                           static_folder="../../../Models/VPC_MS_models/VPC_styles")

#Render template to serve as a HTML loader
@VPC_controller_bp.route('/VPC_dashboard', methods=["GET"])
def vpc_dashboard():
    return render_template('VPC_dashboard.html')

#API endpoints 
@VPC_controller_bp.route('/VPC_in_existance', methods=["GET"])
def VPC_in_existance():
    try:
        VPCs = vpc_in_existance()
        return jsonify({"success": True, "data": VPCs})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"Error": str(e)}), 500

@VPC_controller_bp.route('/Create_VPC', methods=["POST"])
def Create_VPC():
    try:
        data = request.get_json()
        vpc_name = data.get('vpc_name')
        block = data.get('block')
        reply = create_vpc(vpc_name, block)    
        return jsonify({"success": True, "data": reply})

    except Exception as e:
        print(e)    
        
        return jsonify({"Error": str(e)}), 500
    
@VPC_controller_bp.route('/Delete_VPC', methods=["POST"])
def Delete_VPC():
    try:
        data = request.get_json()
        vpc_id = data.get('vpc_id')
        reply = delete_vpc(vpc_id)
        return jsonify({"success": True, "data": reply})
    
    except Exception as e:
        print(e)    
        return jsonify({"Error": str(e)}), 500