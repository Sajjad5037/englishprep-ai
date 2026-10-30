from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

try:
    client = OpenAI()

    response = client.responses.create(
        model="gpt-6.1-sol",
        reasoning={"effort": "low"},
        max_output_tokens=50,
        input="Reply with exactly: evaluation model connection successful.",
    )

    print(response.output_text)

except Exception as error:
    print(f"Error: {type(error).__name__}: {error}")