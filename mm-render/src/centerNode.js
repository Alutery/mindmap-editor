import * as d3 from "d3";

/**
 * Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.
 * @param source
 */
export default function centerNode(source) {
    let scale = this.zoomListener.scale();
    let x = -source.y0;
    let y = -source.x0;

    x = x * scale + this.viewerWidth / 2;
    y = y * scale + this.viewerHeight / 2;
    d3.select('g').transition()
        .duration(this.duration)
        .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
    this.zoomListener.scale(scale);
    this.zoomListener.translate([x, y]);
}
