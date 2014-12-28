 // Type definitions for react-bootstrap
 // Project: https://react-bootstrap.github.io/
 // Definitions by: René Verheij <https://github.com/flyon>
 // Definitions: https://github.com/borisyankov/DefinitelyTyped
/// <reference path="../react/react.d.ts" />

declare module 'react-bootstrap' {
    export var Accordion:React.ComponentFactory<PanelGroupAttributes>;
    export var Affix:React.ComponentFactory<AffixAttributes>;
    export var AffixMixin:React.Mixin<AffixAttributes,any>;
    export var Alert:React.ComponentFactory<AlertAttributes>;
    export var Badge:React.ComponentFactory<BadgeAttributes>;
    export var Button:React.ComponentFactory<ButtonAttributes>;
    export var ButtonGroup:React.ComponentFactory<ButtonGroupAttributes>;
    export var ButtonToolbar:React.ComponentFactory<ReactBootstrapAttributes>;
    export var Carousel:React.ComponentFactory<CarouselAttributes>;
    export var CarouselItem:React.ComponentFactory<CarouselItemAttributes>;
    export var Col:React.ComponentFactory<ColAttributes>;
    export var DropdownButton:React.ComponentFactory<DropdownButtonAttributes>;
    export var DropdownMenu:React.ComponentFactory<DropdownMenuAttributes>;
    export var Glyphicon:React.ComponentFactory<GlyphiconAttributes>;
    export var Grid:React.ComponentFactory<GridAttributes>;
    export var Input:React.ComponentFactory<InputAttributes>;
    export var Interpolate:React.ComponentFactory<InterpolateAttributes>;
    export var Jumbotron:React.ComponentFactory<{}>;
    export var Label:React.ComponentFactory<ReactBootstrapAttributes>;
    export var ListGroup:React.ComponentFactory<ListGroupAttributes>;
    export var ListGroupItem:React.ComponentFactory<ListGroupItemAttributes>;
    export var MenuItem:React.ComponentFactory<MenuItemAttributes>;
    export var Modal:React.ComponentFactory<ModalAttributes>;
    export var ModalTrigger:React.ComponentFactory<ModalTriggerAttributes>;
    export var Nav:React.ComponentFactory<NavAttributes>;
    export var NavItem:React.ComponentFactory<NavItemAttributes>;
    export var Navbar:React.ComponentFactory<NavbarAttributes>;
    export var OverlayTrigger:React.ComponentFactory<OverlayTriggerAttributes>;
    export var PageHeader:React.ComponentFactory<any>;
    export var PageItem:React.ComponentFactory<PageItemAttributes>;
    export var Pager:React.ComponentFactory<PagerAttributes>;
    export var Panel:React.ComponentFactory<PanelAttributes>;
    export var PanelGroup:React.ComponentFactory<PanelGroupAttributes>;
    export var Popover:React.ComponentFactory<PopoverAttributes>;
    export var ProgressBar:React.ComponentFactory<ProgressBarAttributes>;
    export var Row:React.ComponentFactory<RowAttributes>;
    export var SplitButton:React.ComponentFactory<SplitButtonAttributes>;
    export var SubNav:React.ComponentFactory<SubNavAttributes>;
    export var TabPane:React.ComponentFactory<TabPaneAttributes>;
    export var TabbedArea:React.ComponentFactory<TabbedAreaAttributes>;
    export var Table:React.ComponentFactory<TableAttributes>;
    export var Tooltip:React.ComponentFactory<TooltipAttributes>;
    export var Well:React.ComponentFactory<ReactBootstrapAttributes>;
    
    export var OverlayMixin: any;

    export interface TooltipAttributes extends ReactBootstrapAttributes
    {
            /**
            * oneOf(['top','right', 'bottom', 'left']),
            */
            placement?: string;
            positionLeft?:number;
            positionTop?:number;
            arrowOffsetLeft?:number;
            arrowOffsetTop?:number;
    }
    export interface TableAttributes extends React.HTMLAttributes
    {
            striped?: boolean;
            bordered?: boolean;
            condensed?: boolean;
            hover?: boolean;
            responsive?: boolean;
    }
    export interface TabbedAreaAttributes extends ReactBootstrapAttributes
    {
            /**
            * oneOf(['tabs','pills'])
            */
            bsStyle: string;
            animation: boolean;
            onSelect:(key?:string)=>void;
    }
    export interface TabPaneAttributes extends React.HTMLAttributes
    {
            animation?:boolean;
            active?:boolean;
            onAnimateOutEnd?:()=>void;
    }
    export interface SubNavAttributes extends ReactBootstrapAttributes
    {
            onSelect?: (key?:string, href?:string)=>void;
            active?: boolean;
            disabled?: boolean;
            href?: string;
            title?: string;
            text?: any;
    }

    export interface SplitButtonAttributes extends ReactBootstrapAttributes
    {
            pullRight?: boolean;
            title?: any;
            href?: string;
            /**
            * Is rendered inside <span>
            */
            dropdownTitle?: any
            onClick?: (e?:React.MouseEvent)=>void;
            onSelect?: (key?:string)=>void;
            disabled?: boolean;
    }
    export interface RowAttributes extends React.HTMLAttributes
    {
            componentClass: string;
    }

    export interface ProgressBarAttributes extends ReactBootstrapAttributes
    {
            min?: number;
            now?: number;
            max?: number;
            label?: any;
            /**
            * ScreenReaderOnly
            */
            srOnly?: boolean;
            striped?: boolean;
            active?: boolean;
    }
    export interface PopoverAttributes extends ReactBootstrapAttributes
    {
            /**
            * oneOf(['top','right', 'bottom', 'left']),
            */
            placement?: string;
            positionLeft?: number;
            positionTop?: number;
            arrowOffsetLeft?: number;
            arrowOffsetTop?: number;
            title?: any;
    }
    export interface PanelGroupAttributes extends ReactBootstrapAttributes {
            collapsable?: boolean;
            activeKey?: any;
            defaultActiveKey?: any;
            onSelect?: (key?:string)=>void;
    }
    export interface PanelAttributes extends ReactBootstrapAttributes,CollapsableAttributes {
            onSelect?: (key?:string)=>void;
            header?: any;
            footer?: any;
    }

    export interface PagerAttributes extends React.HTMLAttributes
    {
            onSelect:()=>void;
    }
    export interface PageItemAttributes extends React.HTMLAttributes
    {
            disabled?: boolean;
            previous?: boolean;
            next?: boolean;
            onSelect?:(key?:string,href?:string)=>void;
    }
    export interface OverlayTriggerAttributes extends OverlayAttributes
    {
            /**
            * oneOfType([
                    oneOf(['manual', 'click', 'hover', 'focus']),
                    arrayOf(oneOf(['click', 'hover', 'focus']))
            ])
            */
            trigger?: any;
            /**
            * oneOf(['top','right', 'bottom', 'left']),
            */
            placement?: string;
            delay?: number;
            delayShow?: number;
            delayHide?: number;
            defaultOverlayShown?:boolean;
            overlay: any;
    }
    export interface NavbarAttributes extends ReactBootstrapAttributes
    {
            fixedTop?:boolean;
            fixedBottom?:boolean;
            staticTop?:boolean;
            inverse?:boolean;
            fluid?:boolean;
            role?: string;
            componentClass: string;
            brand?: any;
            toggleButton?: any;
            onToggle?: ()=>void;
            navExpanded?:boolean;
            defaultNavExpanded?: boolean;
    }
    export interface NavItemAttributes extends ReactBootstrapAttributes
    {
            onSelect?:(key?:string,href?:string)=>void;
            active?:boolean;
            disabled?:boolean;
            href?:string;
            title?:string;
    }
    export interface NavAttributes extends ReactBootstrapAttributes,CollapsableAttributes
    {
            /**
            * oneOf('tabs','pills')
            */
            bsStyle?: string;
            stacked?:boolean;
            justified?:boolean;
            //TODO: see what type of attributes
            onSelect?: ()=>void;
            collapsable?:boolean;
            expanded?:boolean;
            navbar?: boolean;
    }
    export interface OverlayAttributes extends React.HTMLAttributes
    {
            /**
            * CustomPropTypes.mountable
            */
            container?: any;
    }
    export interface ModalTriggerAttributes extends OverlayAttributes
    {
            //change to 'any'?
            modal: React.ReactElement<ModalAttributes>
    }

    export interface ModalAttributes extends ReactBootstrapAttributes
    {
            title: any;
            /**
            * oneOf(['static', true, false]),
            */
            backdrop?: string;
            keyboard?: boolean;
            closeButton?:boolean;
            animation?:boolean;
            onRequestHide:()=>void;
    }
    export interface ListGroupItemAttributes extends ReactBootstrapAttributes
    {
            /**
            * oneOf(['danger','info','success','warning']),
            */
            bsStyle?: string;
            active?: any;
            disabled?: any;
            header?: any;
            /**
            * NOTE: In actuality: onClick?: (key?:string,href?:string)=>void;
            * Altough typescript does not allow overwrites
            * React Bootstrap implements onClick different from the React default
            * with two parameters, being: key and href
            * @param key:string
            * @param href:string
            */
            onClick?: (event: React.MouseEvent) => void;

    }
    export interface ListGroupAttributes extends ReactBootstrapAttributes
    {
            onClick:()=>void;
    }
    export interface InterpolateAttributes extends React.HTMLAttributes
    {
            format?: string;
    }

    export interface InputAttributes extends React.HTMLAttributes
    {
            type?: string;
            label?: any;
            help?: any;
            addonBefore?: any;
            addonAfter?: any;
            /**
            * success,warning,error,default,info
            */
            bsStyle?: string;
            hasFeedback?: boolean;
            groupClassName?: string;
            wrapperClassName?: string;
            labelClassName?: string;
            disabled?: boolean;
    }
    export interface GridAttributes extends React.HTMLAttributes
    {
            fluid?:boolean;
            compenentClass:string;
    }
    export interface GlyphiconAttributes extends ReactBootstrapAttributes
    {
            glyph: string;
    }
    export interface DropdownMenuAttributes extends React.HTMLAttributes
    {
            pullRight?: boolean;
            //TODO: what type of attributes?
            onSelect?: ()=>void;
    }
    export interface DropdownButtonAttributes extends ReactBootstrapAttributes
    {
            pullRight?:boolean;
            dropup?:boolean;
            title?:any;
            href?:string;
            onClick?:()=>void;
            onSelect?:(key?:string)=>void;
            navItem?:boolean;
    }
    export interface CollapsableAttributes
    {
            collapsable?: boolean;
            defaultExpanded?: boolean;
            expanded?: boolean;
    }

    export interface ColAttributes extends React.HTMLAttributes
    {
            xs?: number;
            sm?: number;
            md?: number;
            lg?: number;
            xsOffset?: number;
            smOffset?: number;
            mdOffset?: number;
            lgOffset?: number;
            xsPush?: number;
            smPush?: number;
            mdPush?: number;
            lgPush?: number;
            xsPull?: number;
            smPull?: number;
            mdPull?: number;
            lgPull?: number;
            componentClass: string;
    }

    export interface CarouselItemAttributes extends React.HTMLAttributes
    {
            /**
            * oneOf(['prev', 'next']),
            */
            direction?: string;
            onAnimateOutEnd?: (index:string)=>void;
            active?: boolean;
            caption?: any;
    }
    export interface CarouselAttributes extends ReactBootstrapAttributes
    {
            slide?:boolean;
            indicators?:boolean;
            controls?:boolean;
            pauseOnHover?:boolean;
            wrap?:boolean;
            onSelect?:(index?:string,direction?:string)=>void;
            onSlideEnd?: ()=>void;
            activeIndex?: number;
            defaultActiveIndex?: number;
            /**
            * 'prev' or 'next'
            */
            direction?:string;
    }
    export interface ButtonGroupAttributes extends ReactBootstrapAttributes
    {
            vertical?:boolean;
            justified?:boolean;
    }
    export interface ButtonAttributes extends ReactBootstrapAttributes
    {
            active?:boolean;
            disabled?: boolean;
            block?: boolean;
            navItem?:boolean;
            navDropdown?:boolean;
            componentClass?:string;
    }
    export interface BadgeAttributes extends React.HTMLAttributes
    {
            pullRight?: boolean;
    }
    export interface AlertAttributes extends ReactBootstrapAttributes
    {
            onDismiss?: (e?:React.MouseEvent)=>void;
            dismissAfter?: number;
    }
    export interface ReactBootstrapAttributes extends React.HTMLAttributes
    {
            /**
            * Used internally in react-bootstrap
            */
            bsClass?:string;
            /**
            * 'default','primary','success','info','warning','danger',
            *	'link','inline',
            *	'tabs','pills'
            **/
            bsStyle?:string;
            /**
            * 'large','medium','small','xsmall'
            */
            bsSize?:string;
    }
    export interface AffixAttributes extends React.HTMLAttributes
    {
            offset?: number;
            offsetTop?: number;
            offsetBottom?: number;
    }

    export interface MenuItemAttributes extends ReactBootstrapAttributes
    {
            header?:boolean;
            divider?:boolean;
            href?:string;
            title?:string;
            onSelect?:(key?:string)=>void;
    }
}

