import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def associate_rt(rt_id, subnet_id):
    try:
        rt_client = boto3.client('ec2')
        response = rt_client.associate_route_table(
            RouteTableId = rt_id,
            SubnetId = subnet_id
        )

        return {"success": True, "data": { "message": "Route table associated", "route_table_id": rt_id,"subnet_id": subnet_id}}

    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials: {e}")
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
    
