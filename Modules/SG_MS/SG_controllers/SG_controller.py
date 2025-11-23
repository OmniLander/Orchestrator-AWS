import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from Modules.SG_MS.SG_constants.SG_verification import sg_in_existance, sgr_id
from Modules.SG_MS.SG_constants.SG_elimination import delete_sg
from Modules.SG_MS.SG_constants.SG_creation import create_sg
from Modules.SG_MS.SG_constants.SG_update import assign_rules_egress, assign_rules_ingress, revoke_rules_egress, revoke_rules_ingress
from flask import Blueprint, render_template, request, redirect, url_for, Response, jsonify

SG_controller_bp = Blueprint("SG_controller_bp", __name__,
                           template_folder="../../../Models/SG_MS_models/SG_views",
                           static_folder="../../../Models/SG_MS_models/SG_styles")

#Render template to serve as a HTML loader
@SG_controller_bp.route('/SG_dashboard', methods=['GET'])
def SG_dashboard():
    return render_template("SG_dashboard.html")
#endpoints
@SG_controller_bp.route('/SG_in_existance', methods=["GET"])
def SG_in_existance():

    try:
        reply = sg_in_existance()
        return jsonify({"success": True, "data": reply})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@SG_controller_bp.route('/SGR_in_existance', methods=['GET'])
def SGR_in_existance():
    try:
        reply = sgr_id()
        return jsonify({"success": True, "data": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@SG_controller_bp.route('/Create_SG', methods=['POST'])
def Create_SG():
    try:
        data = request.get_json()
        vpc_id = data.get('vpc_id')
        sg_GN = data.get('groupName')
        sg_desc = data.get('description')

        reply = create_sg(vpc_id, sg_GN, sg_desc)
        return jsonify({"Success": True, "data" : reply})
    except Exception as e:
        print(f"Unexpected error {e}")

        return jsonify({"Error": str(e)}), 500
    
@SG_controller_bp.route('/Create_ingress_rule', methods=['POST'])
def Create_ingress_rule():
    try:
        data = request.get_json()
        group_id = data['group_id']
        ip_protocols = data['permissions']

        reply = assign_rules_ingress(group_id, ip_protocols)
        return jsonify({"Success": True, "data" : reply})
    
    except Exception as e:
        print(f"Unexpected error {e}")

        return jsonify({"Error": str(e), 'data': data}), 500

@SG_controller_bp.route('/Create_egress_rule', methods=['POST'])
def Create_egress_rule():
    try:
        data = request.get_json()
        group_id = data['group_id']
        ip_protocols = data['permissions']
        reply = assign_rules_egress(group_id, ip_protocols)
        return jsonify({"Success": True, "data" : reply})
    except Exception as e:
        print(f"Unexpected error {e}")

        return jsonify({"Error": str(e)}), 500
    
@SG_controller_bp.route('/Revoke_ingress_rule', methods=['POST'])
def Revoke_ingress_rule():
    try:
        data = request.get_json()
        group_id = data['group_id']
        rule_id = data['rule_id']
        
        reply = revoke_rules_ingress(group_id, rule_id)
        return jsonify({"Success": True, "data" : reply})
    except Exception as e:
        print(f"Unexpected error {e}")

        return jsonify({"Error": str(e)}), 500

@SG_controller_bp.route('/Revoke_egress_rule', methods=['POST'])
def Revoke_egress_rule():
    try:
        data = request.get_json()
        group_id = data['group_id']
        rule_id = data['rule_id']
        
        reply = revoke_rules_egress(group_id, rule_id)
        return jsonify({"Success": True, "data" : reply})
    except Exception as e:
        print(f"Unexpected error {e}")

        return jsonify({"Error": str(e)}), 500

@SG_controller_bp.route('/Delete_sg', methods=['POST'])
def Delete_SG():
    try:
        data = request.get_json()
        group_id = data['group_id']
        reply = delete_sg(group_id)
        return jsonify({"Success": True, "data" : reply})
    except Exception as e:
        print(f"Unexpected error {e}")

        return jsonify({"Error": str(e)}), 500
