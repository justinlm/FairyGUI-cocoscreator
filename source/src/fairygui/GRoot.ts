
namespace fgui {

    export class GRoot extends GComponent {
        public static contentScaleLevel: number = 0;

        private _modalLayer: GGraph;
        private _popupStack: Array<GObject>;
        private _justClosedPopups: Array<GObject>;
        private _modalWaitPane: GComponent;
        private _tooltipWin: GComponent;
        private _defaultTooltipWin: GComponent;
        private _volumeScale: number;
        private _inputProcessor: InputProcessor;
        private _thisOnResized: Function;

        private _layer1Obj:GComponent;
        private _layer2Obj:GComponent;
        private _layer3Obj:GComponent;
        private _layer4Obj:GComponent;

        public static LAYER_1:number = 1;
        public static LAYER_2:number = 2;
        public static LAYER_3:number = 3;
        public static LAYER_4:number = 4;

        private static _inst: GRoot;

        public static get inst(): GRoot {
            if (!GRoot._inst)
                throw 'Call GRoot.create first!';

            return GRoot._inst;
        }

        public static create(): GRoot {
            GRoot._inst = new GRoot();
            GRoot._inst.node.parent = cc.director.getScene();

            return GRoot._inst;
        }

        public constructor() {
            super();

            this._node.name = "GRoot";
            this.opaque = false;
            this._volumeScale = 1;
            this._popupStack = new Array<GObject>();
            this._justClosedPopups = new Array<GObject>();

            this._modalLayer = new GGraph();
            this._modalLayer.setSize(this.width, this.height);
            this._modalLayer.drawRect(0, cc.Color.TRANSPARENT, UIConfig.modalLayerColor);
            this._modalLayer.addRelation(this, RelationType.Size);

            this._thisOnResized = this.onWinResize.bind(this);

            this._inputProcessor = this.node.addComponent(InputProcessor);
            this._inputProcessor._captureCallback = this.onTouchBegin_1;

            if (CC_EDITOR) {
                (<any>cc).engine.on('design-resolution-changed', this._thisOnResized);
            }
            else {
                if (cc.sys.isMobile) {
                    window.addEventListener('resize', <any>this._thisOnResized);
                }
                else {
                    (<any>cc.view).on('canvas-resize', this._thisOnResized);
                }
            }

            this.onWinResize();

            this._layer1Obj = this.createLayerNode("Layer_1");
            this._layer2Obj = this.createLayerNode("Layer_2");
            this._layer3Obj = this.createLayerNode("Layer_3");
            this._layer4Obj = this.createLayerNode("Layer_4");
        }

        private createLayerNode(name:string):GComponent {
            let layerObj:GComponent = new GComponent();
            layerObj.name = name;
            this.addChild1(layerObj);
            return layerObj;
        }

        private addChild1(child:GComponent):GObject{
            return super.addChild(child);
        }

        public addChild(child:GComponent):GObject{
            console.error("please use AddToUI");
            return null;
        }

        public AddToUI(child:GObject, layer:number):GObject{
            if(child == null || layer < 1 || layer > 4){
                console.error("AddToUI error");
                return null;
            }
            let gobj:GObject;
            switch (layer) {
                case GRoot.LAYER_1:
                    gobj = this._layer1Obj.addChild(child);
                    break;
                case GRoot.LAYER_2:
                    gobj = this._layer2Obj.addChild(child);
                    break;
                case GRoot.LAYER_3:
                    gobj = this._layer3Obj.addChild(child);
                    break;
                case GRoot.LAYER_4:
                    gobj = this._layer4Obj.addChild(child);
                    break;
            }
            return gobj;
        }

        public DeleteUI(child:GObject, layer:number, dispose:boolean = false):GObject{
            let gobj:GObject;
            switch(layer){
                case GRoot.LAYER_1:
                gobj = this._layer1Obj.removeChild(child);
                break;
                case GRoot.LAYER_2:
                gobj = this._layer1Obj.removeChild(child);
                break;
                case GRoot.LAYER_3:
                gobj = this._layer1Obj.removeChild(child);
                break;
                case GRoot.LAYER_4:
                gobj = this._layer4Obj.removeChild(child);
                break;
            }
            return gobj;
        }

        protected onDestroy(): void {
            if (CC_EDITOR) {
                (<any>cc).engine.off('design-resolution-changed', this._thisOnResized);
            }
            else {
                if (cc.sys.isMobile) {
                    window.removeEventListener('resize', <any>this._thisOnResized);
                }
                else {
                    (<any>cc.view).off('canvas-resize', this._thisOnResized);
                }
            }

            if (this == GRoot._inst)
                GRoot._inst = null;
        }

        public getTouchPosition(touchId?: number): cc.Vec2 {
            return this._inputProcessor.getTouchPosition(touchId);
        }

        public get touchTarget(): GObject {
            return this._inputProcessor.getTouchTarget();
        }

        public get inputProcessor(): InputProcessor {
            return this._inputProcessor;
        }

        public showWindow(win: Window): void {
            this.addChild(win);
            win.requestFocus();

            if (win.x > this.width)
                win.x = this.width - win.width;
            else if (win.x + win.width < 0)
                win.x = 0;

            if (win.y > this.height)
                win.y = this.height - win.height;
            else if (win.y + win.height < 0)
                win.y = 0;

            this.adjustModalLayer();
        }

        public hideWindow(win: Window): void {
            win.hide();
        }

        public hideWindowImmediately(win: Window): void {
            if (win.parent == this)
                this.removeChild(win);

            this.adjustModalLayer();
        }

        public bringToFront(win: Window): void {
            var cnt: number = this.numChildren;
            var i: number;
            if (this._modalLayer.parent != null && !win.modal)
                i = this.getChildIndex(this._modalLayer) - 1;
            else
                i = cnt - 1;

            for (; i >= 0; i--) {
                var g: GObject = this.getChildAt(i);
                if (g == win)
                    return;
                if (g instanceof Window)
                    break;
            }

            if (i >= 0)
                this.setChildIndex(win, i);
        }

        public showModalWait(msg?: string): void {
            if (UIConfig.globalModalWaiting != null) {
                if (this._modalWaitPane == null)
                    this._modalWaitPane = UIPackage.createObjectFromURL(UIConfig.globalModalWaiting) as GComponent;
                this._modalWaitPane.setSize(this.width, this.height);
                this._modalWaitPane.addRelation(this, RelationType.Size);

                this.addChild(this._modalWaitPane);
                this._modalWaitPane.text = msg;
            }
        }

        public closeModalWait(): void {
            if (this._modalWaitPane != null && this._modalWaitPane.parent != null)
                this.removeChild(this._modalWaitPane);
        }

        public closeAllExceptModals(): void {
            var arr: Array<GObject> = this._children.slice();
            var cnt: number = arr.length;
            for (var i: number = 0; i < cnt; i++) {
                var g: GObject = arr[i];
                if ((g instanceof Window) && !(<Window><any>g).modal)
                    (<Window><any>g).hide();
            }
        }

        public closeAllWindows(): void {
            var arr: Array<GObject> = this._children.slice();
            var cnt: number = arr.length;
            for (var i: number = 0; i < cnt; i++) {
                var g: GObject = arr[i];
                if (g instanceof Window)
                    (<Window><any>g).hide();
            }
        }

        public getTopWindow(): Window {
            var cnt: number = this.numChildren;
            for (var i: number = cnt - 1; i >= 0; i--) {
                var g: GObject = this.getChildAt(i);
                if (g instanceof Window) {
                    return <Window><any>g;
                }
            }

            return null;
        }

        public get modalLayer(): GGraph {
            return this._modalLayer;
        }

        public get hasModalWindow(): boolean {
            return this._modalLayer.parent != null;
        }

        public get modalWaiting(): boolean {
            return this._modalWaitPane && this._modalWaitPane.node.activeInHierarchy;
        }

        public getPopupPosition(popup: GObject, target?: GObject, downward?: any, result?: cc.Vec2): cc.Vec2 {
            let pos = result ? result : new cc.Vec2();
            var sizeW: number = 0, sizeH: number = 0;
            if (target) {
                pos = target.localToGlobal();
                let pos2 = target.localToGlobal(target.width, target.height);
                sizeW = pos2.x - pos.x;
                sizeH = pos2.y - pos.y;
            }
            else {
                pos = this.getTouchPosition();
                pos = this.globalToLocal(pos.x, pos.y);
            }

            if (pos.x + popup.width > this.width)
                pos.x = pos.x + sizeW - popup.width;
            pos.y += sizeH;
            if ((downward == undefined && pos.y + popup.height > this.height)
                || downward == false) {
                pos.y = pos.y - sizeH - popup.height - 1;
                if (pos.y < 0) {
                    pos.y = 0;
                    pos.x += sizeW / 2;
                }
            }

            return pos;
        }

        public showPopup(popup: GComponent, target?: GObject, downward?: any): void {
            if (this._popupStack.length > 0) {
                var k: number = this._popupStack.indexOf(popup);
                if (k != -1) {
                    for (var i: number = this._popupStack.length - 1; i >= k; i--)
                        this.removeChild(this._popupStack.pop());
                }
            }
            this._popupStack.push(popup);

            if (target != null) {
                var p: GObject = target;
                while (p != null) {
                    if (p.parent == this) {
                        if (popup.sortingOrder < p.sortingOrder) {
                            popup.sortingOrder = p.sortingOrder;
                        }
                        break;
                    }
                    p = p.parent;
                }
            }

            this.addChild(popup);
            this.adjustModalLayer();

            let pt = this.getPopupPosition(popup, target, downward);
            popup.setPosition(pt.x, pt.y);
        }

        public togglePopup(popup: GComponent, target?: GObject, downward?: any): void {
            if (this._justClosedPopups.indexOf(popup) != -1)
                return;

            this.showPopup(popup, target, downward);
        }

        public hidePopup(popup?: GObject): void {
            if (popup != null) {
                var k: number = this._popupStack.indexOf(popup);
                if (k != -1) {
                    for (var i: number = this._popupStack.length - 1; i >= k; i--)
                        this.closePopup(this._popupStack.pop());
                }
            }
            else {
                var cnt: number = this._popupStack.length;
                for (i = cnt - 1; i >= 0; i--)
                    this.closePopup(this._popupStack[i]);
                this._popupStack.length = 0;
            }
        }

        public get hasAnyPopup(): boolean {
            return this._popupStack.length != 0;
        }

        private closePopup(target: GObject): void {
            if (target.parent != null) {
                if (target instanceof Window)
                    (<Window><any>target).hide();
                else
                    this.removeChild(target);
            }
        }

        public showTooltips(msg: string): void {
            if (this._defaultTooltipWin == null) {
                var resourceURL: string = UIConfig.tooltipsWin;
                if (!resourceURL) {
                    console.error("UIConfig.tooltipsWin not defined");
                    return;
                }

                this._defaultTooltipWin = UIPackage.createObjectFromURL(resourceURL) as GComponent;
            }

            this._defaultTooltipWin.text = msg;
            this.showTooltipsWin(this._defaultTooltipWin);
        }

        public showTooltipsWin(tooltipWin: GComponent): void {
            this.hideTooltips();

            this._tooltipWin = tooltipWin;

            let pt: cc.Vec2 = this.getTouchPosition();
            pt.x += 10;
            pt.y += 20;

            this.globalToLocal(pt.x, pt.y, pt);

            if (pt.x + this._tooltipWin.width > this.width) {
                pt.x = pt.x - this._tooltipWin.width - 1;
                if (pt.x < 0)
                    pt.x = 10;
            }
            if (pt.y + this._tooltipWin.height > this.height) {
                pt.y = pt.y - this._tooltipWin.height - 1;
                if (pt.y < 0)
                    pt.y = 10;
            }

            this._tooltipWin.setPosition(pt.x, pt.y);
            this.addChild(this._tooltipWin);
        }

        public hideTooltips(): void {
            if (this._tooltipWin != null) {
                if (this._tooltipWin.parent)
                    this.removeChild(this._tooltipWin);
                this._tooltipWin = null;
            }
        }

        public get volumeScale(): number {
            return this._volumeScale;
        }

        public set volumeScale(value: number) {
            this._volumeScale = value;
        }

        public playOneShotSound(clip: cc.AudioClip, volumeScale?: number) {
            if (volumeScale === undefined) volumeScale = 1;
            cc.audioEngine.play(clip, false, this._volumeScale * volumeScale);
        }

        private adjustModalLayer(): void {
            var cnt: number = this.numChildren;

            if (this._modalWaitPane != null && this._modalWaitPane.parent != null)
                this.setChildIndex(this._modalWaitPane, cnt - 1);

            for (var i: number = cnt - 1; i >= 0; i--) {
                var g: GObject = this.getChildAt(i);
                if ((g instanceof Window) && (<Window>g).modal) {
                    if (this._modalLayer.parent == null)
                        this.addChildAt(this._modalLayer, i);
                    else
                        this.setChildIndexBefore(this._modalLayer, i);
                    return;
                }
            }

            if (this._modalLayer.parent != null)
                this.removeChild(this._modalLayer);
        }

        private onTouchBegin_1(evt: Event): void {
            if (this._tooltipWin != null)
                this.hideTooltips();

            this._justClosedPopups.length = 0;
            if (this._popupStack.length > 0) {
                let mc: GObject = evt.initiator;
                while (mc != this && mc != null) {
                    let pindex: number = this._popupStack.indexOf(mc);
                    if (pindex != -1) {
                        for (let i: number = this._popupStack.length - 1; i > pindex; i--) {
                            var popup: GObject = this._popupStack.pop();
                            this.closePopup(popup);
                            this._justClosedPopups.push(popup);
                        }
                        return;
                    }
                    mc = mc.findParent();
                }

                let cnt: number = this._popupStack.length;
                for (let i: number = cnt - 1; i >= 0; i--) {
                    popup = this._popupStack[i];
                    this.closePopup(popup);
                    this._justClosedPopups.push(popup);
                }
                this._popupStack.length = 0;
            }
        }

        private onWinResize(): void {
            let size = cc.view.getCanvasSize();
            size.width /= cc.view.getScaleX();
            size.height /= cc.view.getScaleY();

            let pos = cc.view.getViewportRect().origin;
            pos.x = pos.x / cc.view.getScaleX();
            pos.y = pos.y / cc.view.getScaleY();

            this.setSize(size.width, size.height);
            this._node.setPosition(-pos.x, this._height - pos.y);

            this.updateContentScaleLevel();
        }

        public handlePositionChanged() {
            //nothing here
        }

        private updateContentScaleLevel(): void {
            var ss: number = Math.max(cc.view.getScaleX(), cc.view.getScaleY());
            if (ss >= 3.5)
                GRoot.contentScaleLevel = 3; //x4
            else if (ss >= 2.5)
                GRoot.contentScaleLevel = 2; //x3
            else if (ss >= 1.5)
                GRoot.contentScaleLevel = 1; //x2
            else
                GRoot.contentScaleLevel = 0;
        }
    }
}