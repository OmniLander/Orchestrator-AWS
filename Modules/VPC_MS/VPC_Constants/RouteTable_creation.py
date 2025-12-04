import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def create_route(gate_id, rt_id):
    try:
        rt_client = boto3.client('ec2')
        response = rt_client.create_route(
            DestinationCidrBlock= '0.0.0.0/0',
            GatewayId= gate_id,
            RouteTableId= rt_id,
        )

        return {"success": True,"data": {"message": "Route created","route_table_id": rt_id, "gateway_id": gate_id}
}
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
    
def create_route_table(vpc_id):
    try:
        ec2 = boto3.client("ec2")

        # Crear la route table
        response = ec2.create_route_table(VpcId=vpc_id)

        rtb = response["RouteTable"]
        rtb_id = rtb["RouteTableId"]

        return {
            "success": True,
            "data": {
                "route_table_id": rtb_id,
                "vpc_id": vpc_id
            }
        }

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials: {e}")
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side: {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error: {e}")
        return {"success": False, "error": str(e)}
