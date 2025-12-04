from Modules.VPC_MS.VPC_Constants.VPC_Creation import create_vpc, create_subnet, orq_vpc, orq_subnet
from Modules.VPC_MS.VPC_Constants.VPC_elimination import delete_vpc, delete_subnet
from Modules.VPC_MS.VPC_Constants.VPC_Verification import vpcs_in_existence, subnets_in_existence
from Modules.VPC_MS.VPC_Constants.ACL_verification import acl_in_existance
from Modules.VPC_MS.VPC_Constants.ACL_creation import create_ACL
from Modules.VPC_MS.VPC_Constants.ACL_elimination import delete_acl, delete_acl_entry
from Modules.VPC_MS.VPC_Constants.ACL_update import acl_update
from Modules.VPC_MS.VPC_Constants.IGW_creation import create_igw
from Modules.VPC_MS.VPC_Constants.IGW_elimination import delete_igw
from Modules.VPC_MS.VPC_Constants.IGW_update import igw_attach
from Modules.VPC_MS.VPC_Constants.IGW_verification import igw_in_existence
from Modules.VPC_MS.VPC_Constants.RouteTable_update import associate_rt
from Modules.VPC_MS.VPC_Constants.RouteTable_verification import route_table_in_existence 
from Modules.VPC_MS.VPC_Constants.RouteTable_creation import create_route, create_route_table
from flask import Blueprint, render_template, request, redirect, url_for, Response, jsonify

VPC_controller_bp = Blueprint("VPC_controller_bp", __name__,
                           template_folder="../../../Models/VPC_MS_models/VPC_views",
                           static_folder="../../../Models/VPC_MS_models/VPC_styles")

#Render template to serve as a HTML loader
@VPC_controller_bp.route('/VPC_dashboard', methods=["GET"])
def VPC_dashboard():
    return render_template('VPC_dashboard.html')

@VPC_controller_bp.route('/ACL_dashboard', methods=["GET"])
def ACL_dashboard():
    return render_template('ACL_dashboard.html')

@VPC_controller_bp.route('/IGW_dashboard', methods=["GET"])
def IGW_dashboard():
    return render_template('IGW_dashboard.html')

@VPC_controller_bp.route('/RouteTable_dashboard', methods=["GET"])
def RouteTable_dashboard():
    return render_template('RouteTable_dashboard.html')

@VPC_controller_bp.route('/Subnet_dashboard', methods=["GET"])
def Subnet_dashboard():
    return render_template('Subnet_dashboard.html')
#endpoints

# ORCHESTRATED CREATION (Advanced Config)

@VPC_controller_bp.route('/create_vpc_orchestrated', methods=['POST'])
def create_vpc_orq_endpoint():
    try:
        data = request.get_json()
        
        required_fields = ['vpc_name', 'cidr_block']
        
        if not data or not all(field in data for field in required_fields):
            return jsonify({
                "success": False, 
                "error": f"Missing parameters. Required: {required_fields}"
            }), 400

        result = orq_vpc(**data)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/create_subnet_orchestrated', methods=['POST'])
def create_subnet_orq_endpoint():
    try:
        data = request.get_json()
        
        required_fields = ['vpc_id', 'cidr_block', 'subnet_name']
        
        if not data or not all(field in data for field in required_fields):
            return jsonify({
                "success": False, 
                "error": f"Missing parameters. Required: {required_fields}"
            }), 400

        result = orq_subnet(**data)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500
    
# GESTIÓN DE VPC (VPC & SUBNET)

@VPC_controller_bp.route('/create_vpc', methods=['POST'])
def create_vpc_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'vpc_name' not in data or 'block' not in data:
            return jsonify({"success": False, "error": "Missing parameters: 'vpc_name' and 'block' are required"}), 400

        result = create_vpc(**data)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/delete_vpc', methods=['POST'])
def delete_vpc_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'vpc_id' not in data:
            return jsonify({"success": False, "error": "Missing parameter: 'vpc_id' is required"}), 400

        result = delete_vpc(**data)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/vpcs_in_existence', methods=['GET'])
def verify_vpcs_endpoint():
    try:
        result = vpcs_in_existence()
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/create_subnet', methods=['POST'])
def create_subnet_endpoint():
    try:
        data = request.get_json()
        
        required_fields = ['vpc_id', 'cidr_block', 'subnet_name']
        if not data or not all(field in data for field in required_fields):
            return jsonify({"success": False, "error": f"Missing parameters. Required: {required_fields}"}), 400

        result = create_subnet(**data)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/delete_subnet', methods=['POST'])
def delete_subnet_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'subnet_id' not in data:
            return jsonify({"success": False, "error": "Missing parameter: 'subnet_id' is required"}), 400

        result = delete_subnet(**data)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/subnets_in_existence', methods=['GET'])
def verify_subnets_endpoint():
    try:
        result = subnets_in_existence()

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500
    
# GESTIÓN DE ACLs (NETWORK ACCESS CONTROL LISTS)

@VPC_controller_bp.route('/create_acl', methods=['POST'])
def create_acl_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'vpc_id' not in data or 'acl_name' not in data:
            return jsonify({"success": False, "error": "Missing parameters: 'vpc_id' and 'acl_name' are required"}), 400

        result = create_ACL(**data)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/delete_acl', methods=['POST'])
def delete_acl_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'acl_id' not in data:
            return jsonify({"success": False, "error": "Missing parameter: 'acl_id' is required"}), 400

        result = delete_acl(**data)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/delete_acl_entry', methods=['POST'])
def delete_acl_entry_endpoint():
    try:
        data = request.get_json()
        
        required_fields = ['acl_id', 'rule_number', 'egress']
        if not data or not all(field in data for field in required_fields):
            return jsonify({"success": False, "error": f"Missing parameters. Required: {required_fields}"}), 400

        result = delete_acl_entry(**data)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/update_acl', methods=['POST'])
def update_acl_endpoint():
    try:
        data = request.get_json()
        
        required_fields = ['acl_id', 'rule_number', 'protocol', 'action', 'egress', 'cidr_block']
        
        if not data or not all(field in data for field in required_fields):
            return jsonify({"success": False, "error": f"Missing parameters. Required: {required_fields}"}), 400


        result = acl_update(**data)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/acl_in_existence', methods=['GET'])
def verify_acl_endpoint():
    try:
        result = acl_in_existance()

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500
    
# GESTIÓN DE INTERNET GATEWAYS (IGW)

@VPC_controller_bp.route('/create_igw', methods=['POST'])
def create_igw_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'igw_name' not in data:
            return jsonify({"success": False, "error": "Missing parameter: 'igw_name' is required"}), 400

        result = create_igw(**data)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/delete_igw', methods=['POST'])
def delete_igw_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'igw_id' not in data:
            return jsonify({"success": False, "error": "Missing parameter: 'igw_id' is required"}), 400

        result = delete_igw(**data)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/attach_igw', methods=['POST'])
def attach_igw_endpoint():
    try:
        data = request.get_json()
        
        required_fields = ['igw_id', 'vpc_id']
        
        if not data or not all(field in data for field in required_fields):
            return jsonify({"success": False, "error": f"Missing parameters. Required: {required_fields}"}), 400

        result = igw_attach(**data)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/igw_in_existence', methods=['GET'])
def verify_igw_endpoint():
    try:
        result = igw_in_existence()

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500
    
# GESTIÓN DE ROUTE TABLES

@VPC_controller_bp.route('/create_route_table', methods=['POST'])
def create_rt_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'vpc_id' not in data:
            return jsonify({"success": False, "error": "Missing parameter: 'vpc_id' is required"}), 400

        result = create_route_table(**data)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/create_route', methods=['POST'])
def create_route_endpoint():
    try:
        data = request.get_json()
        
        required_fields = ['gate_id', 'rt_id']
        
        if not data or not all(field in data for field in required_fields):
            return jsonify({"success": False, "error": f"Missing parameters. Required: {required_fields}"}), 400

        result = create_route(**data)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/associate_rt', methods=['POST'])
def associate_rt_endpoint():
    try:
        data = request.get_json()
        
        required_fields = ['rt_id', 'subnet_id']
        
        if not data or not all(field in data for field in required_fields):
            return jsonify({"success": False, "error": f"Missing parameters. Required: {required_fields}"}), 400

        result = associate_rt(**data)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500


@VPC_controller_bp.route('/route_table_in_existence', methods=['GET'])
def verify_rt_endpoint():
    try:
        result = route_table_in_existence()

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500

    except Exception as e:
        return jsonify({"success": False, "error": f"Controller Error: {str(e)}"}), 500