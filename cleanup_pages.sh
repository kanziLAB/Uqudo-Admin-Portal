#!/bin/bash

# Script to remove unnecessary template pages from the Uqudo Admin Portal

cd "/Users/uqudo/Desktop/Admin Portal/ui-master/pages"

# List of template pages to remove
TEMPLATE_PAGES=(
    "dashboard.html"
    "sign-in.html"
    "sign-up.html"
    "profile.html"
    "billing.html"
    "virtual-reality.html"
    "rtl.html"
    "tables.html"
    "typography.html"
    "icons.html"
    "notifications.html"
    "map.html"
    "landing.html"
    "template.html"
)

echo "=== Cleaning up unnecessary template pages ==="
echo ""

for page in "${TEMPLATE_PAGES[@]}"; do
    if [ -f "$page" ]; then
        rm "$page"
        echo "✓ Deleted: $page"
    else
        echo "⊘ Not found: $page"
    fi
done

echo ""
echo "=== Cleanup complete ==="
echo ""
echo "Remaining pages (Uqudo Portal only):"
ls -1 *.html

echo ""
echo "Total pages remaining: $(ls -1 *.html | wc -l)"
