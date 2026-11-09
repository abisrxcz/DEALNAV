with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = '<h2 class="font-semibold text-lg">${esc(d.name)}</h2>'
replacement = '<div class="font-mono text-xs text-slate-500 uppercase mt-1">Inspection Evidence</div><h2 class="font-bold text-2xl font-mono tracking-tight">${esc(d.cid)}</h2><div class="text-sm font-semibold text-slate-700 dark:text-slate-200">${esc(d.name)}</div>'

assert target in content, "target not found"
content = content.replace(target, replacement, 1)

with open('index.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("evModal updated successfully!")

