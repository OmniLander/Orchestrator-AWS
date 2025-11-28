import boto3
from botocore.exceptions import NoCredentialsError, ClientError

#assign rules structure kinda for the moment tbh 
# ip_protocols = {
#     'IpProtocol': '',
#     'FromPort': ,
#     'IpRanges': [
#             {
#                 'CidrIp': '0.0.0.0/0',
#                 'Description': 'optional',
#             },
#         ],
#     'ToPort': 
# }

def assign_rules_ingress(group_id, permissions):
    try:
        sg_client = boto3.client('ec2')

        response = sg_client.authorize_security_group_ingress(
        GroupId = group_id,
        IpPermissions = [
            permissions
        ]
        )

        return response

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}

def assign_rules_egress(group_id, permissions):
    try:
        sg_client = boto3.client('ec2')

        response = sg_client.authorize_security_group_egress (
        GroupId = group_id,
        IpPermissions = [
            permissions
        ]
        )

        return response

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)} 
    
def revoke_rules_ingress(group_id, rule_id):
    try:
        sg_client = boto3.client('ec2')

        response = sg_client.revoke_security_group_ingress (
        GroupId = group_id,
        SecurityGroupRuleIds = rule_id
        )

        return response

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}  
    
def revoke_rules_egress(group_id, rule_id):
    try:
        sg_client = boto3.client('ec2')

        response = sg_client.revoke_security_group_egress (
        GroupId = group_id,
        SecurityGroupRuleIds = rule_id
        )

        return response

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}  