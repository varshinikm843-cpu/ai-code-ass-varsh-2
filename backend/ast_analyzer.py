import ast

class CodeASTAnalyzer:
    @staticmethod
    def analyze_python(code: str) -> dict:
        """Parses Python source code into AST and extracts metrics."""
        try:
            tree = ast.parse(code)
            functions, classes, loops = [], [], 0

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    functions.append(node.name)
                elif isinstance(node, ast.ClassDef):
                    classes.append(node.name)
                elif isinstance(node, (ast.For, ast.While)):
                    loops += 1

            return {
                "valid_syntax": True,
                "error": None,
                "metrics": {
                    "functions": functions,
                    "classes": classes,
                    "loop_count": loops,
                    "node_count": len(list(ast.walk(tree)))
                }
            }
        except SyntaxError as e:
            return {
                "valid_syntax": False,
                "error": f"Syntax Error on line {e.lineno}: {e.msg}",
                "metrics": {}
            }

    @staticmethod
    def analyze_generic(code: str, language: str) -> dict:
        """Generic static inspection for non-Python languages (Java, C++, JS)."""
        lines = code.splitlines()
        non_empty = [line.strip() for line in lines if line.strip()]
        
        return {
            "valid_syntax": True,
            "error": None,
            "metrics": {
                "language": language,
                "total_lines": len(lines),
                "non_empty_lines": len(non_empty)
            }
        }