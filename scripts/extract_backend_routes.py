#!/usr/bin/env python3
"""Statically extracts the backend's HTTP contract (no imports, no dependencies): method, path, query params, body fields.
Usage: python3 scripts/extract_backend_routes.py /path/to/backend > contract/backend-routes.json"""
import ast, json, pathlib, sys

root = pathlib.Path(sys.argv[1])
API_PREFIX = "/api/v1"
src_dir = root / "app" / "api" / "v1"
METHODS = {"get", "post", "put", "patch", "delete"}

# ---- pydantic request models: class name -> {fields, required}
models: dict[str, dict] = {}
bases: dict[str, list[str]] = {}
for f in (root / "app" / "schemas").glob("*.py"):
    tree = ast.parse(f.read_text(encoding="utf8"))
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            fields = {}
            for st in node.body:
                if isinstance(st, ast.AnnAssign) and isinstance(st.target, ast.Name) and not st.target.id.startswith(("v_", "_", "model_")):
                    req = st.value is None
                    if isinstance(st.value, ast.Call) and getattr(st.value.func, "id", "") == "Field":
                        d = st.value.args[0] if st.value.args else next((k.value for k in st.value.keywords if k.arg == "default"), None)
                        req = isinstance(d, ast.Constant) and d.value is Ellipsis or (d is None and not any(k.arg in ("default", "default_factory") for k in st.value.keywords))
                    fields[st.target.id] = req
            models[node.name] = fields
            bases[node.name] = [b.id for b in node.bases if isinstance(b, ast.Name)]

def all_fields(name, seen=None):
    seen = seen or set()
    if name in seen or name not in models:
        return {}
    seen.add(name)
    out = {}
    for b in bases.get(name, []):
        out.update(all_fields(b, seen))
    out.update(models[name])
    return out

routes = []
for f in sorted(src_dir.glob("*.py")):
    tree = ast.parse(f.read_text(encoding="utf8"))
    prefix = ""
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call) and getattr(node.value.func, "id", "") == "APIRouter":
            for k in node.value.keywords:
                if k.arg == "prefix":
                    prefix = k.value.value
    for fn in ast.walk(tree):
        if not isinstance(fn, (ast.AsyncFunctionDef, ast.FunctionDef)):
            continue
        for dec in fn.decorator_list:
            if (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and dec.func.attr in METHODS and dec.args
                    and isinstance(dec.func.value, ast.Name) and dec.func.value.id == "router"):
                path = prefix + dec.args[0].value
                path_params = {p.strip("{}").split(":")[0] for p in path.split("/") if p.startswith("{")}
                query, body = {}, None
                a = fn.args
                pos = a.posonlyargs + a.args
                defaults = [None] * (len(pos) - len(a.defaults)) + list(a.defaults)
                for arg, dflt in list(zip(pos, defaults)) + list(zip(a.kwonlyargs, a.kw_defaults)):
                    n = arg.arg
                    ann = ast.unparse(arg.annotation) if arg.annotation else ""
                    dtxt = ast.unparse(dflt) if dflt is not None else ""
                    if n in path_params or n in ("request", "response", "self") or "Depends" in dtxt or "Header" in dtxt or ann in ("Request", "Response", "Principal"):
                        continue
                    if ann in models:  # request body model
                        body = {"model": ann, "fields": all_fields(ann)}
                    else:
                        required = dflt is None or dtxt.startswith("Query(...")
                        alias = None
                        if isinstance(dflt, ast.Call):
                            alias = next((k.value.value for k in dflt.keywords if k.arg == "alias" and isinstance(k.value, ast.Constant)), None)
                        query[alias or n] = bool(required)
                routes.append({"method": dec.func.attr.upper(), "path": API_PREFIX + path, "query": query, "body": body, "file": f.name})
# non-API routes defined in main.py
routes += [{"method": "GET", "path": "/health/live", "query": {}, "body": None, "file": "main.py"}, {"method": "GET", "path": "/health/ready", "query": {}, "body": None, "file": "main.py"}]
json.dump(routes, sys.stdout, indent=1, default=str)
