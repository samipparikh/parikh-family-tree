// Family Tree Visualization using D3.js
(function () {
    const svg = d3.select("#tree-svg");
    const container = svg.append("g");
    const tooltip = d3.select("#tooltip");

    let currentView = "paternal";
    let currentData = paternalData;

    const nodeWidth = 160;
    const nodeHeight = 50;
    const horizontalSpacing = 200;
    const verticalSpacing = 80;

    const zoom = d3.zoom()
        .scaleExtent([0.2, 3])
        .on("zoom", (event) => {
            container.attr("transform", event.transform);
        });

    svg.call(zoom);

    function collapseAfterDepth(node, maxDepth, depth = 0) {
        if (node.children && depth >= maxDepth) {
            node._children = node.children;
            node.children = null;
        }
        if (node.children) {
            node.children.forEach(child => collapseAfterDepth(child, maxDepth, depth + 1));
        }
    }

    let initialRender = true;

    function buildHierarchy(data) {
        return d3.hierarchy(data, d => d.children);
    }

    function renderTree(data) {
        container.selectAll("*").remove();

        const root = buildHierarchy(data);

        if (initialRender) {
            collapseAfterDepth(root, 1);
            initialRender = false;
        }
        const treeLayout = d3.tree()
            .nodeSize([horizontalSpacing, verticalSpacing])
            .separation((a, b) => {
                return a.parent === b.parent ? 1.2 : 1.8;
            });

        treeLayout(root);

        // Draw links
        container.selectAll(".link")
            .data(root.links())
            .join("path")
            .attr("class", "link")
            .attr("d", d => {
                return `M${d.source.x},${d.source.y + nodeHeight}
                        C${d.source.x},${d.source.y + nodeHeight + 30}
                         ${d.target.x},${d.target.y - 30}
                         ${d.target.x},${d.target.y}`;
            });

        // Draw nodes
        const nodes = container.selectAll(".node")
            .data(root.descendants())
            .join("g")
            .attr("class", d => {
                let cls = "node";
                if (d.data.isHighlighted) cls += " root";
                else if (d.data.gender === "male") cls += " male";
                else if (d.data.gender === "female") cls += " female";
                else if (d.data.gender === "couple") cls += " root";
                return cls;
            })
            .attr("transform", d => `translate(${d.x - nodeWidth / 2},${d.y})`)
            .on("mouseover", (event, d) => showTooltip(event, d.data))
            .on("mouseout", hideTooltip)
            .on("click", (event, d) => toggleChildren(d));

        // Node background
        nodes.append("rect")
            .attr("width", nodeWidth)
            .attr("height", nodeHeight)
            .attr("rx", 6)
            .attr("ry", 6);

        // Name text
        nodes.append("text")
            .attr("class", "name")
            .attr("x", nodeWidth / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .text(d => {
                const name = d.data.name;
                return name.length > 18 ? name.substring(0, 16) + "…" : name;
            });

        // Spouse text
        nodes.append("text")
            .attr("class", "detail")
            .attr("x", nodeWidth / 2)
            .attr("y", 36)
            .attr("text-anchor", "middle")
            .text(d => {
                if (d.data.spouse) return `∞ ${d.data.spouse}`;
                return "";
            });

        // Children count indicator
        nodes.filter(d => d.data.children && d.data.children.length > 0 && d.children === undefined)
            .append("text")
            .attr("x", nodeWidth / 2)
            .attr("y", nodeHeight + 14)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", "#999")
            .text(d => `▼ ${d.data._children ? d.data._children.length : d.data.children.length} children`);

        // Center the tree
        centerTree(root);
    }

    function centerTree(root) {
        const bounds = container.node().getBBox();
        const parent = svg.node().parentElement;
        const fullWidth = parent.clientWidth;
        const fullHeight = parent.clientHeight;

        const padding = 60;
        const scale = Math.min(
            fullWidth / (bounds.width + padding * 2),
            fullHeight / (bounds.height + padding * 2),
            1.5
        );

        const tx = fullWidth / 2 - (bounds.x + bounds.width / 2) * scale;
        const ty = fullHeight / 2 - (bounds.y + bounds.height / 2) * scale;

        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }

    function toggleChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        renderTree(currentData);
    }

    function showTooltip(event, data) {
        let html = `<strong>${data.name}</strong>`;
        if (data.spouse) html += `<br>Spouse: ${data.spouse}`;
        if (data.details) html += `<br>${data.details}`;
        if (data.children) html += `<br>Children: ${data.children.length}`;

        tooltip
            .classed("hidden", false)
            .html(html)
            .style("left", (event.pageX + 12) + "px")
            .style("top", (event.pageY - 10) + "px");
    }

    function hideTooltip() {
        tooltip.classed("hidden", true);
    }

    // Button handlers
    document.getElementById("btn-paternal").addEventListener("click", () => {
        setActive("btn-paternal");
        currentView = "paternal";
        currentData = paternalData;
        initialRender = true;
        renderTree(currentData);
    });

    document.getElementById("btn-maternal").addEventListener("click", () => {
        setActive("btn-maternal");
        currentView = "maternal";
        currentData = maternalData;
        initialRender = true;
        renderTree(currentData);
    });

    document.getElementById("btn-both").addEventListener("click", () => {
        setActive("btn-both");
        currentView = "both";
        initialRender = true;
        currentData = {
            name: "Sudhir & Jayshree",
            gender: "couple",
            details: "Parents of Samip & Sujay",
            isHighlighted: true,
            children: [
                {
                    name: "Paternal: Mohanlal Parikh",
                    gender: "male",
                    details: "Dad's side",
                    children: paternalData.children
                },
                {
                    name: "Maternal: Contractor",
                    gender: "female",
                    details: "Mom's side (Ratilal & Sharda)",
                    children: maternalData.children
                },
                {
                    name: "Sujay",
                    gender: "male",
                    spouse: "Praveen",
                    children: [
                        { name: "Lina", gender: "female" },
                        { name: "Anya", gender: "female" }
                    ]
                },
                {
                    name: "Samip",
                    gender: "male",
                    spouse: "Sapna",
                    isHighlighted: true,
                    children: [
                        { name: "Shrey", gender: "male" },
                        { name: "Nevan", gender: "male" }
                    ]
                }
            ]
        };
        renderTree(currentData);
    });

    document.getElementById("btn-zoom-in").addEventListener("click", () => {
        svg.transition().call(zoom.scaleBy, 1.3);
    });

    document.getElementById("btn-zoom-out").addEventListener("click", () => {
        svg.transition().call(zoom.scaleBy, 0.7);
    });

    document.getElementById("btn-reset").addEventListener("click", () => {
        initialRender = true;
        renderTree(currentData);
    });

    function setActive(id) {
        document.querySelectorAll("#controls button").forEach(btn => btn.classList.remove("active"));
        document.getElementById(id).classList.add("active");
    }

    // Add legend
    const legend = document.createElement("div");
    legend.className = "legend";
    legend.innerHTML = `
        <div class="legend-item"><div class="legend-color" style="background:#e8f0f8;border-color:#4a7fa5;"></div> Male</div>
        <div class="legend-item"><div class="legend-color" style="background:#f8e8f0;border-color:#a54a7f;"></div> Female</div>
        <div class="legend-item"><div class="legend-color" style="background:#fff8e8;border-color:#b8860b;"></div> Highlighted / You</div>
    `;
    document.getElementById("tree-container").appendChild(legend);

    // Initial render
    renderTree(currentData);

    // Handle resize
    window.addEventListener("resize", () => renderTree(currentData));
})();
