import boto3
from Modules.VPC_MS.VPC_constants.VPC_creation import create_vpc, create_subnet
from Modules.VPC_MS.VPC_constants.VPC_elimination import delete_vpc, delete_subnet
from Modules.VPC_MS.VPC_constants.VPC_verification import vpc_in_existance, subnets_in_existance
from Modules.VPC_MS.VPC_constants.ACL_verification import acl_in_existance
from Modules.VPC_MS.VPC_constants.ACL_creation import create_ACL
from Modules.VPC_MS.VPC_constants.ACL_elimination import delete_acl, delete_acl_entry
from Modules.VPC_MS.VPC_constants.ACL_update import acl_update
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
        reply = vpc_in_existance()
        return jsonify({"success": True, "data": reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"error": str(e)}), 500
    
@VPC_controller_bp.route('/Subnets_in_existance', methods=["GET"])
def Subnets_in_existance():
    try:
        reply = subnets_in_existance()
        return jsonify({"success": True, "data": reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"error": str(e)}), 500
    
@VPC_controller_bp.route('/ACL_in_existance', methods=['GET'])
def ACL_in_existance():
    try:
       reply = acl_in_existance()
       return jsonify({"success": True, "data": reply})

    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    
@VPC_controller_bp.route('/Create_subnet', methods=['POST'])
def Create_subnet():
    try:
        data = request.get_json()
        vpc_id = data.get('vpc_id')
        cidr_block = data.get('cidr_block')
        subnet_name = data.get('subnet_name')
        reply= create_subnet(vpc_id, cidr_block, subnet_name)
        if isinstance(reply, dict) and "error" in reply:
             return jsonify({"success": False, "error": reply["error"]}), 400
        return jsonify({"success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@VPC_controller_bp.route('/Create_VPC', methods=["POST"])
def Create_VPC():
    try:
        data = request.get_json()
        vpc_name = data.get('vpc_name')
        block = data.get('block')
        reply = create_vpc(vpc_name, block)    
        if isinstance(reply, dict) and "error" in reply:
             return jsonify({"success": False, "error": reply["error"]}), 400
        return jsonify({"success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"success": False, "error": str(e)}), 500


    
@VPC_controller_bp.route('/Delete_VPC', methods=["POST"])
def Delete_VPC():
    try:
        data = request.get_json()
        vpc_id = data.get('vpc_id')
        reply = delete_vpc(vpc_id)
        if isinstance(reply, dict) and "error" in reply:
             return jsonify({"success": False, "error": reply["error"]}), 400
        return jsonify({"success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"success": False, "error": str(e)}), 500

    
@VPC_controller_bp.route('/Delete_subnet', methods=["POST"])
def Delete_subnet():
    try:
        data = request.get_json()
        subnet_id = data.get('subnet_id')
        reply = delete_subnet(subnet_id)
        if isinstance(reply, dict) and "error" in reply:
             return jsonify({"success": False, "error": reply["error"]}), 400
        return jsonify({"success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@VPC_controller_bp.route('/Create_acl', methods = ['POST'])
def Create_acl():
    try:
        data = request.get_json()
        vpc_id = data.get("vpc_id")
        acl_name = data.get("acl_name")

        reply = create_ACL(vpc_id, acl_name)
    
        if isinstance(reply, dict) and "error" in reply:
             return jsonify({"success": False, "error": reply["error"]}), 400
        return jsonify({"success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"success": False, "error": str(e)}), 500

    
@VPC_controller_bp.route('/Delete_acl', methods = ['POST'])
def Delete_acl():
    try:
        data = request.get_json()
        acl_id = data.get('acl_id')

        reply = delete_acl(acl_id)
        if isinstance(reply, dict) and "error" in reply:
             return jsonify({"success": False, "error": reply["error"]}), 400
        return jsonify({"success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@VPC_controller_bp.route("/Delete_acl_entry", methods = ['POST'])
def Delete_acl_entry():
    try:
        data = request.get_json()
        acl_id = data.get('acl_id')
        rule_number = data.get('rule_number')
        egress = data.get('egress')
        reply = delete_acl_entry(acl_id, rule_number, egress)
        if isinstance(reply, dict) and "error" in reply:
             return jsonify({"success": False, "error": reply["error"]}), 400
        return jsonify({"success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@VPC_controller_bp.route("/Update_acl", methods=['POST'])
def Update_acl():
    try:
        data = request.get_json()
        
        acl_id = data.get('acl_id')
        rule_number = data.get('rule_number')
        action = data.get('action')
        egress = data.get('egress')
        cidr_block = data.get('cidr_block') 
        port_from = data.get('port_from')
        port_to = data.get('port_to')
        
        # Obtener el protocolo crudo 'tcp', 'UDP', 'All'
        raw_protocol = data.get('protocol', '').lower()

        protocol_map = {
            'tcp': '6',
            'udp': '17',
            'icmp': '1',
            'all': '-1'
        }
   
        protocol = protocol_map.get(raw_protocol, raw_protocol)

        reply = acl_update(acl_id, rule_number, protocol, action, egress, cidr_block, port_from, port_to)

        if isinstance(reply, dict) and "error" in reply:
             return jsonify({"success": False, "error": reply["error"]}), 400
        return jsonify({"success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"success": False, "error": str(e)}), 500
