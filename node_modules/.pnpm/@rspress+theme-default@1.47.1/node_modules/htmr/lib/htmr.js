'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var React = _interopDefault(require('react'));
var htmlparser2 = require('htmlparser2');
var htmlEntities = require('html-entities');

// convert attr to valid react props
function mapAttribute(originalTag, attrs, preserveAttributes, getPropInfo) {
    if (attrs === void 0) { attrs = {}; }
    return Object.keys(attrs).reduce(function (result, attr) {
        // ignore inline event attribute
        if (/^on.*/.test(attr)) {
            return result;
        }
        // Convert attribute to camelCase except data-* and aria-* attribute
        // https://facebook.github.io/react/docs/dom-elements.html
        var attributeName = attr;
        if (!/^(data|aria)-/.test(attr)) {
            // Allow preserving non-standard attribute, e.g: `ng-if`
            var preserved = preserveAttributes.filter(function (at) {
                if (at instanceof RegExp) {
                    return at.test(attr);
                }
                return at === attr;
            });
            if (preserved.length === 0) {
                attributeName = hypenColonToCamelCase(attr);
            }
        }
        var prop = getPropInfo(originalTag, attributeName);
        if (prop.name === 'style') {
            // if there's an attribute called style, this means that the value must be exists
            // even if it's an empty string
            result[prop.name] = convertStyle(attrs.style);
        }
        else {
            var value = attrs[attr];
            // Convert attribute value to boolean attribute if needed
            // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes
            var booleanAttrributeValue = value === '' ||
                String(value).toLowerCase() === attributeName.toLowerCase();
            result[prop.name] = prop.isBoolean ? booleanAttrributeValue : value;
        }
        return result;
    }, {});
}
function convertProperty(prop) {
    if (/^-ms-/.test(prop)) {
        // eslint-disable-next-line no-param-reassign
        prop = prop.substr(1);
    }
    // keep CSS custom properties as is
    if (prop.startsWith('--')) {
        return prop;
    }
    return hypenColonToCamelCase(prop);
}
function convertValue(value) {
    // value can be converted to pixel automatically by converting it to number
    if (/^\d+$/.test(value)) {
        return Number(value);
    }
    return value.replace(/'/g, '"');
}
function convertStyle(styleStr) {
    var style = {};
    styleStr
        .split(';')
        // non-empty declaration
        .filter(function (style) { return style.trim() !== ''; })
        .forEach(function (declaration) {
        var rules = declaration.split(':');
        if (rules.length > 1) {
            var prop = convertProperty(rules[0].trim());
            // handle url: attribute on style
            var val = convertValue(rules.slice(1).join(':').trim());
            style[prop] = val;
        }
    });
    return style;
}
function hypenColonToCamelCase(str) {
    // convert hypen and colon to camel case
    // color-profile -> colorProfile
    // xlink:role -> xlinkRole
    return str.replace(/(-|:)(.)/g, function (match, symbol, char) {
        return char.toUpperCase();
    });
}

function htmrServer(html, options) {
    if (options === void 0) { options = {}; }
    if (typeof html !== 'string') {
        throw new TypeError('Expected HTML string');
    }
    var doc = htmlparser2.parseDocument(html.trim(), {});
    var nodes = doc.childNodes.map(function (node, index) {
        return toReactNode(node, index.toString(), options);
    });
    return nodes.length === 1 ? nodes[0] : nodes;
}
var TABLE_ELEMENTS = ['table', 'tbody', 'thead', 'tfoot', 'tr'];
function toReactNode(childNode, key, options) {
    var transform = options.transform || {};
    var preserveAttributes = options.preserveAttributes || [];
    var dangerouslySetChildren = options.dangerouslySetChildren || ['style'];
    var defaultTransform = transform._;
    switch (childNode.type) {
        case 'script':
        case 'style':
        case 'tag': {
            var node = childNode;
            var name_1 = node.name, attribs_1 = node.attribs;
            // decode all attribute value
            Object.keys(attribs_1).forEach(function (key) {
                attribs_1[key] = htmlEntities.decode(attribs_1[key]);
            });
            var props = Object.assign({}, mapAttribute(name_1, attribs_1, preserveAttributes, getPropInfo), { key: key });
            var customElement = transform[name_1];
            // if the tags children should be set dangerously
            if (dangerouslySetChildren.indexOf(name_1) > -1) {
                // Tag can have empty children
                if (node.children.length > 0) {
                    var childNode_1 = node.children[0];
                    var html = name_1 === 'style' || name_1 === 'script'
                        ? // preserve encoding on style & script tag
                            childNode_1.data.trim()
                        : htmlEntities.encode(childNode_1.data.trim());
                    props.dangerouslySetInnerHTML = { __html: html };
                }
                return customElement
                    ? React.createElement(customElement, props, null)
                    : defaultTransform
                        ? defaultTransform(name_1, props, null)
                        : React.createElement(name_1, props, null);
            }
            var childNodes = node.children
                .map(function (node, index) { return toReactNode(node, index.toString(), options); })
                .filter(Boolean);
            // self closing component doesn't have children
            var children = childNodes.length === 0 ? null : childNodes;
            if (customElement) {
                return React.createElement(customElement, props, children);
            }
            if (defaultTransform) {
                return defaultTransform(name_1, props, children);
            }
            return React.createElement(name_1, props, children);
        }
        case 'text': {
            var node = childNode;
            var str = node.data;
            if (node.parent && TABLE_ELEMENTS.indexOf(node.parent.name) > -1) {
                str = str.trim();
                if (str === '') {
                    return null;
                }
            }
            str = htmlEntities.decode(str);
            return defaultTransform ? defaultTransform(str) : str;
        }
    }
}
function getPropInfo(_originalTag, attributeName) {
    var propName = attrs[attributeName] || attributeName;
    return {
        name: propName,
        isBoolean: BOOLEAN_ATTRIBUTES.includes(propName),
    };
}
var attrs = {
    for: 'htmlFor',
    class: 'className',
    acceptcharset: 'acceptCharset',
    accesskey: 'accessKey',
    allowfullscreen: 'allowFullScreen',
    autocomplete: 'autoComplete',
    autofocus: 'autoFocus',
    autoplay: 'autoPlay',
    cellpadding: 'cellPadding',
    cellspacing: 'cellSpacing',
    charset: 'charSet',
    classid: 'classID',
    classname: 'className',
    colspan: 'colSpan',
    contenteditable: 'contentEditable',
    contextmenu: 'contextMenu',
    crossorigin: 'crossOrigin',
    datetime: 'dateTime',
    enctype: 'encType',
    formaction: 'formAction',
    formenctype: 'formEncType',
    formmethod: 'formMethod',
    formnovalidate: 'formNoValidate',
    formtarget: 'formTarget',
    frameborder: 'frameBorder',
    hreflang: 'hrefLang',
    htmlfor: 'htmlFor',
    httpequiv: 'httpEquiv',
    inputmode: 'inputMode',
    itemscope: 'itemScope',
    itemprop: 'itemProp',
    itemtype: 'itemType',
    keyparams: 'keyParams',
    keytype: 'keyType',
    marginheight: 'marginHeight',
    marginwidth: 'marginWidth',
    maxlength: 'maxLength',
    mediagroup: 'mediaGroup',
    minlength: 'minLength',
    novalidate: 'noValidate',
    radiogroup: 'radioGroup',
    readonly: 'readOnly',
    rowspan: 'rowSpan',
    spellcheck: 'spellCheck',
    srcdoc: 'srcDoc',
    srclang: 'srcLang',
    srcset: 'srcSet',
    tabindex: 'tabIndex',
    usemap: 'useMap',
    viewbox: 'viewBox',
};
var BOOLEAN_ATTRIBUTES = [
    // https://github.com/facebook/react/blob/cae635054e17a6f107a39d328649137b83f25972/packages/react-dom/src/shared/DOMProperty.js#L319
    'allowFullScreen',
    'async',
    // Note: there is a special case that prevents it from being written to the DOM
    // on the client side because the browsers are inconsistent. Instead we call focus().
    'autoFocus',
    'autoPlay',
    'controls',
    'default',
    'defer',
    'disabled',
    'disablePictureInPicture',
    'disableRemotePlayback',
    'formNoValidate',
    'hidden',
    'loop',
    'noModule',
    'noValidate',
    'open',
    'playsInline',
    'readOnly',
    'required',
    'reversed',
    'scoped',
    'seamless',
    // Microdata
    'itemScope',
];

module.exports = htmrServer;
