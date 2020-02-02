// TODO: Pan function, can be better implemented.
import * as d3 from "d3";

export function pan(domNode, direction) {
    let speed = this.panSpeed;
    let translateCoords;
    let scaleX, scaleY;
    let scale;
    let translateX, translateY;

    if (this.panTimer) {
        clearTimeout(this.panTimer);
        translateCoords = d3.transform(this.svgGroup.attr("transform"));
        if (direction === 'left' || direction === 'right') {
            translateX = direction === 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
            translateY = translateCoords.translate[1];
        } else if (direction === 'up' || direction === 'down') {
            translateX = translateCoords.translate[0];
            translateY = direction === 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
        }
        scaleX = translateCoords.scale[0];
        scaleY = translateCoords.scale[1];
        scale = this.zoomListener.scale();
        this.svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
        d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
        this.zoomListener.scale(this.zoomListener.scale());
        this.zoomListener.translate([translateX, translateY]);
        this.panTimer = setTimeout(() => {
            this.pan(domNode, speed, direction);
        }, 50);
    }
}
