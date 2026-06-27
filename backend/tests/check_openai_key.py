import os
import asyncio
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

async def main():
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("AI_MODEL", "gpt-4o-mini")
    
    if not api_key:
        print("Failure: OPENAI_API_KEY is not set.")
        return

    client = AsyncOpenAI(api_key=api_key)
    
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Say 'hello'"}]
        )
        print("Success: API call succeeded.")
    except Exception as e:
        print(f"Failure: API call failed with error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
