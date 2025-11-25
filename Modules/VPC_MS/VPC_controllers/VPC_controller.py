import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from Modules.VPC_MS.VPC_constants.VPC_creation import create_vpc, create_subnet
from Modules.VPC_MS.VPC_constants.VPC_elimination import delete_vpc, delete_subnet
from Modules.VPC_MS.VPC_constants.VPC_verification import vpc_in_existance, subnets_in_existance
from Modules.VPC_MS.VPC_constants.ACL_verification import acl_in_existance
from Modules.VPC_MS.VPC_constants.ACL_creation import create_ACL
from Modules.VPC_MS.VPC_constants.ACL_elimination import delete_acl
from Modules.VPC_MS.VPC_constants.ACL_update import  acl_update
from flask import Blueprint, render_template, request, redirect, url_for, Response, jsonify

VPC_controller_bp = Blueprint("VPC_controller_bp", __name__,
                           template_folder="../../../Models/VPC_MS_models/VPC_views",
                           static_folder="../../../Models/VPC_MS_models/VPC_styles")

#Render template to serve as a HTML loader
@VPC_controller_bp.route('/VPC_dashboard', methods=["GET"])
def VPC_dashboard():
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
    
@VPC_controller_bp.route('/Subnets_in_existance', methods=["GET"])
def Subnets_in_existance():
    try:
        VPCs = subnets_in_existance()
        return jsonify({"success": True, "data": VPCs})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"Error": str(e)}), 500
    
@VPC_controller_bp.route('/Create_subnet', methods=['POST'])
def Create_subnet():
    try:
        data = request.get_json()
        vpc_id = data.get('vpc_id')
        cidr_block = data.get('cidr_block')
        subnet_name = data.get('subnet_name')
        reply= create_subnet(vpc_id, cidr_block, subnet_name)
        return jsonify({"success": True, "data": reply})
    except Exception as e:
        print(e)    
        
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
    
@VPC_controller_bp.route('/Delete_subnet', methods=["POST"])
def Delete_subnet():
    try:
        data = request.get_json()
        subnet_id = data.get('subnet_id')
        reply = delete_subnet(subnet_id)
        return jsonify({"success": True, "data": reply})
    
    except Exception as e:
        print(e)    
        return jsonify({"Error": str(e)}), 500
    
@VPC_controller_bp.route('/ACL_in_existance', methods=['GET'])
def ACL_in_existance():
    try:
        reply = acl_in_existance()
        return jsonify({"success": True, "data": reply})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@VPC_controller_bp.route('/Create_acl', methods = ['POST'])
def Create_acl():
    try:
        data = request.get_json()
        vpc_id = data.get("vpc_id")
        acl_name = data.get("acl_name")

        reply = create_ACL(vpc_id, acl_name)
    
        return jsonify({"Success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")

        return jsonify({"Error": str(e)}), 500
    
@VPC_controller_bp.route('/Update_acl', methods = ['POST'])
def Update_acl():
    try:
        data = request.get_json()
        acl_id = data.get("acl_id")
        rule_number = data.get("rule_number")
        protocol = data.get('protocol')
        action = data.get('action')
        egress = data.get('egress')
        reply = acl_update(acl_id, rule_number, protocol, action, egress)
        return jsonify({"Success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"Error": str(e)}), 500

@VPC_controller_bp.route('/Delete_acl', methods = ['POST'])
def Delete_acl():
    try:
        data = request.get_json()
        acl_id = data.get('acl_id')

        reply = delete_acl(acl_id)
        return jsonify({"Success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"Error": str(e)}), 500