import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def create_vpc(vpc_name, block):
    try:
        vpc_client = boto3.client('ec2')
        response = vpc_client.create_vpc(
            CidrBlock = block,
            TagSpecifications=[
                {
                'ResourceType': 'vpc',
                'Tags': [
                    {
                        'Key': 'Name',
                        'Value': vpc_name
                    }
                ]
                }
            ]
        )

        vpc_info = {
            'vpc_id': response['Vpc']['VpcId'],
            'vpc_state': response['Vpc']['State'],
            'cidr_block': response['Vpc']['CidrBlock']
        }

        return {"success": True, "data": vpc_info}
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
    
def create_subnet(vpc_id, cidr_block, subnet_name):
    try:
        subnet_client = boto3.client('ec2')
        response = subnet_client.create_subnet(
            VpcId = vpc_id,
            CidrBlock = cidr_block,
            AvailabilityZone = 'us-east-1a',
            TagSpecifications=[
                {
                    'ResourceType': 'subnet',
                    'Tags': [
                        {
                            'Key': 'Name',
                            'Value': subnet_name
                        },
                    ]
                },
            ]
        )

        subnet_info = {
            "subnet_id" : response['Subnet']['SubnetId'],
            "subnet_state": response['Subnet']['State'] 
            }

        return {"success": True, "data": subnet_info}
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}

def update_state(subnet_id):
    try:
        subnet_client = boto3.client('ec2')
        response = subnet_client.modify_subnet_attribute(
            SubnetId=subnet_id,
            MapPublicIpOnLaunch={'Value': True}
        )

        return {"success": True, "data": {"message": "Successfully updated", "subnet_id": subnet_id}}

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
    
def update_vpc_orq_DnsHostnames(vpc_id):
    try:
        vpc_client = boto3.client('ec2')
        response = vpc_client.modify_vpc_attribute(
            VpcId = vpc_id,
            EnableDnsHostnames={
                'Value': True
            }
        )

        return {"success": True, "data": {"message": "Successfully updated", "vpc_id": vpc_id}}
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}

def update_vpc_orq_DnsSupport(vpc_id):
    try:
        vpc_client = boto3.client('ec2')
        response = vpc_client.modify_vpc_attribute(
            VpcId = vpc_id,
            EnableDnsSupport={
                'Value': True
            }
        )

        return {"success": True, "data": {"message": "Successfully updated", "vpc_id": vpc_id}}
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)} 

def orq_subnet(vpc_id, cidr_block, subnet_name):
    subnet_result = create_subnet(vpc_id, cidr_block, subnet_name)

    if not subnet_result["success"]:
        return subnet_result

    subnet_id = subnet_result["data"]["subnet_id"]

    update_result = update_state(subnet_id)

    if not update_result["success"]:
        return update_result

    return {"success": True,"data": {**subnet_result["data"], "MapPublicIpOnLaunch": True
        }
    }

def orq_vpc(vpc_name, cidr_block):

    vpc_result = create_vpc(vpc_name, cidr_block)

    if not vpc_result["success"]:
        return vpc_result

    vpc_id = vpc_result["data"]["vpc_id"]

    dns_host_result = update_vpc_orq_DnsHostnames(vpc_id)
    if not dns_host_result["success"]:
        return dns_host_result

    dns_support_result = update_vpc_orq_DnsSupport(vpc_id)
    if not dns_support_result["success"]:
        return dns_support_result

    return {
        "success": True,"data": {"vpc_id": vpc_id,"message": "Orchestrator VPC has been successfully created and configured."}
    }
