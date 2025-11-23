import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from Modules.Key_MS.Key_constants.Key_verification import key_in_existance
from Modules.Key_MS.Key_constants.Key_creation import create_keypair
from Modules.Key_MS.Key_constants.Key_elimination import delete_key
from flask import Blueprint, render_template, request, redirect, url_for, Response, jsonify

Key_controller_bp = Blueprint("Key_controller_bp", __name__,
                            template_folder="../../../Models/Key_MS_models/Key_views",
                            static_folder="../../../Models/Key_MS_models/Key_styles")

#Render templates
@Key_controller_bp.route('/key_dashboard', methods=["GET"])
def key_dashboard():
    return render_template('key_dashboard.html')


#API endpoints
@Key_controller_bp.route('/Keys_in_existance', methods=['GET'])
def Keys_in_existance():
    try:
        keys = key_in_existance()
        return jsonify({"Success": True, "Data": keys})
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return jsonify({"Error": str(e)}), 500
    
@Key_controller_bp.route('/Create_key', methods=['POST'])
def Create_key():
    try:
        data = request.get_json()
        key_name = data.get('key_name')
        key_format = data.get('key_format')
        reply = create_keypair(key_name, key_format)

        return jsonify({"success": True, "data": reply})

    except Exception as e:
        print(e)   

@Key_controller_bp.route('/Delete_key', methods=['POST'])
def Delete_key():
    try:
        data = request.get_json()
        key_id = data.get('key_id')
        key_name = data.get('key_name')
        reply = delete_key(key_id, key_name)

        return jsonify({"success": True, "data": reply})
    
    except Exception as e:
        print(e)    
        return jsonify({"Error": str(e)}), 500