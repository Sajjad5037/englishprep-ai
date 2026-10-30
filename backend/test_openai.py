from dotenv import load_dotenv
from openai import OpenAI
from openai import AuthenticationError, APIConnectionError

load_dotenv()

try:
    client = OpenAI()

    models = client.models.list()

    print("OpenAI connection successful!")
    print(f"Available models: {len(models.data)}")

except AuthenticationError:
    print("Authentication failed. Check your OPENAI_API_KEY.")

except APIConnectionError:
    print("Could not connect to OpenAI. Check your internet connection.")

except Exception as error:
    print(f"An error occurred: {type(error).__name__}: {error}")