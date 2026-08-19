from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import ast
import re
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
groq_client = Groq(api_key=GROQ_API_KEY)

class CodeRequest(BaseModel):
    code: str
    mode: str = "full-scan"
    language: str = "python"

# --- 1. AST & Code Analysis Engine ---
def perform_ast_analysis(code: str, lang: str):
    if lang == "python":
        try:
            parsed_ast = ast.parse(code)
            functions = [node.name for node in ast.walk(parsed_ast) if isinstance(node, ast.FunctionDef)]
            classes = [node.name for node in ast.walk(parsed_ast) if isinstance(node, ast.ClassDef)]
            loops = sum(1 for node in ast.walk(parsed_ast) if isinstance(node, (ast.For, ast.While)))
            return {
                "valid_syntax": True,
                "error": None,
                "metrics": {
                    "functions": functions,
                    "classes": classes,
                    "loop_count": loops,
                    "total_nodes": len(list(ast.walk(parsed_ast)))
                }
            }
        except SyntaxError as e:
            return {
                "valid_syntax": False,
                "error": f"Line {e.lineno}: {e.msg}",
                "metrics": {"functions": [], "classes": [], "loop_count": 0, "total_nodes": 0}
            }
    else:
        # C-style Structural AST Parser for JavaScript, Java, C++
        open_b = code.count('{')
        close_b = code.count('}')
        valid = (open_b == close_b)
        functions = re.findall(r'(?:function\s+|void\s+|int\s+|String\s+|def\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', code)
        loops = len(re.findall(r'\b(for|while)\b', code))
        return {
            "valid_syntax": valid,
            "error": None if valid else "Mismatched curly braces '{ }'",
            "metrics": {
                "functions": functions,
                "classes": [],
                "loop_count": loops,
                "total_nodes": len(code.splitlines())
            }
        }

@app.post("/api/analyze")
async def analyze_code(request: CodeRequest):
    code = request.code
    mode = request.mode.lower().replace("_", "-")
    lang = request.language.lower()

    # Step 1: Perform Local AST / Structural Code Analysis
    ast_result = perform_ast_analysis(code, lang)

    # Return pure AST structural metrics if AST mode is selected
    if mode in ["ast", "structure-only"]:
        return {
            "status": "success",
            "mode": mode,
            "language": lang,
            "ast_analysis": ast_result
        }

    # Step 2: Build LLM Prompts matching Problem Statement 19
    prompts = {
        "explain": f"""You are an AI programming assistant. Explain the following {lang.upper()} source code clearly step-by-step in structured bullet points. Mention its main functionality and purpose:

```{lang}
{code}
```""",

        "bugs": f"""You are an AI code reviewer. Perform a detailed bug analysis on this {lang.upper()} code. 
Identify syntax issues, potential logic bugs, runtime risks, or missing edge cases. If no bugs exist, explicitly state that the code is clean:

```{lang}
{code}
```""",

        "suggest-fix": f"""You are an AI code optimizer. Provide a fully corrected and optimized version of this {lang.upper()} code. 
Explain the key improvements and fixes applied:

```{lang}
{code}
```""",

        "full-scan": f"""You are an expert AI software engineer. Perform a comprehensive analysis of the following {lang.upper()} code:
1. **Code Functionality Explanation**
2. **Bug Analysis & Potential Issues**
3. **Suggested Improvements & Refactoring**
4. **Optimized & Corrected Code Output**

Source Code ({lang.upper()}):
```{lang}
{code}
```"""
    }

    selected_prompt = prompts.get(mode, prompts["full-scan"])

    # Step 3: Call Groq LLM API
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful, precise programming assistant and code analyzer."
                },
                {
                    "role": "user",
                    "content": selected_prompt
                }
            ],
            temperature=0.2,
            max_tokens=2048
        )
        ai_response = completion.choices[0].message.content
    except Exception as e:
        ai_response = f"Groq API Error: {str(e)}"

    return {
        "status": "success",
        "mode": mode,
        "language": lang,
        "ast_analysis": ast_result,
        "result": ai_response
    }