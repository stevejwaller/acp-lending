#!/bin/bash
# Find all HTML files in the root (not in subdirectories like acp-site)
# and add the dynamic-content script tag before </body>

SCRIPT_TAG='  <script src="/js/dynamic-content.js" defer></script>'

# Files to process (all root-level HTML files except admin/index.html)
for file in *.html investor-brief/*.html; do
    if [ -f "$file" ] && [ "$file" != "admin/index.html" ]; then
        # Check if the script tag already exists
        if ! grep -q "dynamic-content.js" "$file"; then
            echo "Adding script tag to $file"
            # Add the script tag before </body>
            sed -i "s|</body>|${SCRIPT_TAG}\n</body>|" "$file"
        else
            echo "Script tag already exists in $file"
        fi
    fi
done

echo "Done!"
