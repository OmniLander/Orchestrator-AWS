# External_calls.py
import requests

def call_keys():
    try:
        resp = requests.get("http://192.168.100.48:5001/Keys_in_existance", timeout=5)
        reply_data = resp.json() 
        return reply_data

    except Exception as e:
        return {"success": False, "error": str(e)} 

def call_SG():
    try:
        resp = requests.get("http://192.168.100.48:5003/SG_in_existance", timeout=5)
        reply_data = resp.json()
        return reply_data
    
    except Exception as e:
        return {"success": False, "error": str(e)} 

def call_subnet():
    try:
        resp = requests.get("http://192.168.100.48:5004/subnets_in_existence", timeout=5)
        reply_data = resp.json()
        return reply_data
    
    except Exception as e:
        return {"success": False, "error": str(e)} 

def call_vpc():
    try:
        resp = requests.get("http://192.168.100.48:5004/vpcs_in_existence", timeout=5)
        reply_data = resp.json()
        return reply_data
    
    except Exception as e:
        return {"success": False, "error": str(e)}