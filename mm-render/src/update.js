import * as d3 from "d3";

export default function update(source) {
    // Compute the new height, function counts total children of root node and sets tree height accordingly.
    // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
    // This makes the layout more consistent.
    let levelWidth = [1];
    let childCount = (level, n) => {

        if (n.children && n.children.length > 0) {
            if (levelWidth.length <= level + 1) levelWidth.push(0);

            levelWidth[level + 1] += n.children.length;
            n.children.forEach((d) => {
                childCount(level + 1, d);
            });
        }
    };
    childCount(0, this.root);

    let newHeight = d3.max(levelWidth) * 30; // 25 pixels per line
    this.tree = this.tree.size([newHeight, this.viewerWidth]);

    // Compute the new tree layout.
    let nodes = this.tree.nodes(this.root).reverse(),
        links = this.tree.links(nodes);

    // Set widths between levels based on maxLabelLength.
    nodes.forEach(function (d) {
        d.y = (d.depth * (this.maxLabelLength * 7)); //maxLabelLength * 10px
        // alternatively to keep a fixed scale one can set a fixed depth per level
        // Normalize for fixed-depth by commenting out below line
        // d.y = (d.depth * 500); //500px per level.
    }, this);

    // Update the nodes…
    let node = this.svgGroup.selectAll("g.node")
        .data(nodes, (d) => {
            return d.id || (d.id = ++(this.i));
        });

    // Enter any new nodes at the parent's previous position.
    let nodeEnter = node.enter().append("g")
        .call(this.dragListener)
        .attr("class", "node")
        .attr("transform", function (d) {
            return "translate(" + source.y0 + "," + source.x0 + ")";
        })
        .on('click', (d) => {
            if (d3.event.defaultPrevented) return; // click suppressed
            d = this.toggleChildren(d);
            this.updateMaxLabelLength();
            this.update(d);
            this.centerNode(d);
        });

    nodeEnter.append("circle")
        .attr('class', 'nodeCircle')
        .attr("r", 0)
        .style("fill", function (d) {
            return (!d._children && !d.children) ? "#2f227a" : (d._children ? "lightsteelblue" : "#fff");
        })
        .on('contextmenu', d3.contextMenu(this.menu));
    // adding popup dialogue for changing/adding/deleting nodes to circles


    nodeEnter.append("text")
        .attr("x", function (d) {
            return d.children || d._children ? -10 : 10;
        })
        .attr("dy", ".35em")
        .attr('class', 'nodeText')
        .attr('contenteditable', 'true')
        .attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
        })
        .text((d) => {
            return this.getStatus(d) + d.name + ' ' + d.icons.join('');
        })
        .style("fill-opacity", 0)
        .on('contextmenu', d3.contextMenu(this.menu));
    // adding popup dialogue for changing/adding/deleting nodes for text captions too

    let textG = nodeEnter.append('g')
        .on('click', function (d) {
            // window.location = d.url;
        });

    textG.append('text')
        .attr('x', function (d) {
            return d.children || d._children ? -15 : 15;
        })
        .attr('y', function (d) {
            return 11;
        })
        .text((d) => {
            return this.showAttributes && !!d.attributes.length ? d.attributes[0][0] + ': ' + d.attributes[0][1] : '';
        })
        .style('fill', '#929292')
        .style('font-size', '6px');

    // phantom node to give us mouseover in a radius around it
    nodeEnter.append("circle")
        .attr('class', 'ghostCircle')
        .attr("r", 30)
        .attr("opacity", 0.2) // change this to zero to hide the target area
        .style("fill", "#a499c4")
        .attr('pointer-events', 'mouseover')
        .on("mouseover", (node) => {
            this.overCircle(node);
        })
        .on("mouseout", (node) => {
            this.outCircle(node);
        });

    // Update the text to reflect whether node has children or not.
    node.select('.node text')
        .attr("x", function (d) {
            return d.children || d._children ? -10 : 10;
        })
        .attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
        })
        .text((d) => {
            return this.getStatus(d) + d.name + ' ' + d.icons.join('');
        });

    node.select('.node g text')
        .attr('x', function (d) {
            return d.children || d._children ? -10 : 10;
        })
        .attr('y', function (d) {
            return 11;
        })
        .attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
        })
        .text((d) => {
            return this.showAttributes && !!d.attributes.length ? d.attributes[0][0] + ': ' + d.attributes[0][1] : '';
        })
        .style('fill', '#929292')
        .style('font-size', '6px');

    // Change the circle fill depending on whether it has children and is collapsed
    node.select("circle.nodeCircle")
        .attr("r", 4.5)
        .style("fill", function (d) {
            return (!d._children && !d.children) ? "#08457e" : (d._children ? "lightsteelblue" : "#fff");
        });

    // Transition nodes to their new position.
    let nodeUpdate = node.transition()
        .duration(this.duration)
        .attr("transform", function (d) {
            return "translate(" + d.y + "," + d.x + ")";
        });

    // Fade the text in
    nodeUpdate.select("text")
        .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    let nodeExit = node.exit().transition()
        .duration(this.duration)
        .attr("transform", function (d) {
            return "translate(" + source.y + "," + source.x + ")";
        })
        .remove();

    nodeExit.select("circle")
        .attr("r", 0);

    nodeExit.select("text")
        .style("fill-opacity", 0);

    // Update the links…
    let link = this.svgGroup.selectAll("path.link")
        .data(links, function (d) {
            return d.target.id;
        });

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", (d) => {
            let o = {
                x: source.x0,
                y: source.y0
            };
            return this.diagonal({
                source: o,
                target: o
            });
        });

    // Transition links to their new position.
    link.transition()
        .duration(this.duration)
        .attr("d", this.diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(this.duration)
        .attr("d", (d) => {
            let o = {
                x: source.x,
                y: source.y
            };
            return this.diagonal({
                source: o,
                target: o
            });
        })
        .remove();

    // Stash the old positions for transition.
    nodes.forEach(function (d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}
