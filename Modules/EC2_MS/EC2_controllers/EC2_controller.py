import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from Modules.EC2_MS.EC2_constants.EC2_verification import ec2_in_existance
from Modules.EC2_MS.EC2_constants.EC2_creation import create_ec2
from Modules.EC2_MS.EC2_constants.EC2_elimination import delete_ec2
from Modules.EC2_MS.EC2_constants.External_calls import call_keys, call_SG, call_subnet
from flask import Blueprint, render_template, request, redirect, url_for, Response, jsonify


EC2_controller_bp = Blueprint("EC2_controller_bp", __name__,
                           template_folder="../../../Models/EC2_MS_models/EC2_views",
                           static_folder="../../../Models/EC2_MS_models/EC2_styles")

#Render template to serve as a HTML loader
@EC2_controller_bp.route('/Ec2_dashboard', methods=["GET"])
def Ec2_dashboard():
    return render_template('Ec2_dashboard.html')

#endpoints
@EC2_controller_bp.route('/EC2_in_existance', methods=['GET'])
def EC2_in_existance():
    try:
        EC2s = ec2_in_existance()
        return jsonify({"success": True, "data": EC2s})

    except Exception as e: 
        print(f"Unexpected error {e}")
        return jsonify({"Error": str(e)}), 500
    
@EC2_controller_bp.route("/Create_EC2", methods=["POST"])
def Create_EC2():
    try:
        data = request.get_json()
        image_id = data.get('image_id')
        instance_type = data.get('instance_type')
        max_count = int(data.get('max_count',1))
        key_name = data.get('key_name')
        security_group_id = data.get('security_group_id')
        subnet_id = data.get('subnet_id')
        instance_name = data.get('instance_name')
        reply = create_ec2(image_id, instance_type, max_count, key_name, security_group_id, subnet_id, instance_name)
        return jsonify({"success": True, "data": reply})

    except Exception as e: 
        print(f"Unexpected error {e}")
        return jsonify({"Error": str(e)}), 500

@EC2_controller_bp.route("/Delete_ec2", methods=['POST'])
def Delete_ec2():
    try:
        data = request.get_json()
        ec2_id = data.get('ec2_id')
        reply = delete_ec2(ec2_id)
        return jsonify({"success": True, "data": reply})
    
    except Exception as e:
        print(e)    
        return jsonify({"Error": str(e)}), 500
    
#external calls

@EC2_controller_bp.route('/get_available_keys', methods=['GET'])
def get_available_keys():
    try:
        response = call_keys() 
        return jsonify(response)
    except Exception as e:
        return jsonify({"Error": str(e)}), 500

@EC2_controller_bp.route('/get_available_sgs', methods=['GET'])
def get_available_sgs():
    try:
        response = call_SG()
        return jsonify(response)
    except Exception as e:
        return jsonify({"Error": str(e)}), 500

@EC2_controller_bp.route('/get_available_subnets', methods=['GET'])
def get_available_subnets():
    try:
        response = call_subnet()
        return jsonify(response)
    except Exception as e:
        return jsonify({"Error": str(e)}), 500
