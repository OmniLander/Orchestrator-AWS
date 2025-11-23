import requests

def call_keys():
    try:
        reply_data = requests.get("http://192.168.100.48:5001/Keys_in_existance")
        return reply_data.json()
        
    except Exception as e:
        print(f"Unexpected error {e}")
        return None    
    
def call_SG():
    try:
        reply_data = requests.get("http://192.168.100.48:5003/SG_in_existance")
        return reply_data.json()
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None

def call_subnet():
    try:
        reply_data = requests.get("http://192.168.100.48:5004/Subnets_in_existance")
        return reply_data.json()
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None
    