'use strict';

var hasOwn = Object.prototype.hasOwnProperty,
    fs,
    path;

if (require) {
    fs = require('fs');
    path = require('path');
}

function noop() {
    return '';
}

function getStack(context) {
    return context.$$layoutStack || (
        context.$$layoutStack = []
    );
}

function applyStack(context) {
    var stack = getStack(context);

    while (stack.length) {
        stack.shift()(context);
    }
}

function getActions(context) {
    return context.$$layoutActions || (
        context.$$layoutActions = {}
    );
}

function getActionsByName(context, name) {
    var actions = getActions(context);

    return actions[name] || (
        actions[name] = []
    );
}

function applyAction(val, action) {
    var context = this;

    function fn() {
        return action.fn(context, action.options);
    }

    switch (action.mode) {
        case 'append': {
            return val + fn();
        }

        case 'prepend': {
            return fn() + val;
        }

        case 'replace': {
            return fn();
        }

        default: {
            return val;
        }
    }
}

function getComponent(context) {
    return context.$$layoutComponents || (
        context.$$layoutComponents = []
    );
}

function mixin(target) {
    var arg, key,
        len = arguments.length,
        i = 1;

    for (; i < len; i++) {
        arg = arguments[i];

        if (!arg) {
            continue;
        }

        for (key in arg) {
            // istanbul ignore else
            if (hasOwn.call(arg, key)) {
                target[key] = arg[key];
            }
        }
    }

    return target;
}

/**
 * Generates an object of layout helpers.
 *
 * @type {Function}
 * @param {Object} handlebars Handlebars instance.
 * @param {Object} layoutOpt layout option.
 * @return {Object} Object of helpers.
 */
function layouts(handlebars, layoutOpt) {
    layoutOpt = layoutOpt || {};
    /**
     * 编译模板
     * @param  {String} name     模板名
     * @param  {String} template 模版字符串或函数
     * @return {Function}        编译执行函数
     */
    function compileTempl(name, template) {
        // Partial template required
        if (!template) {
            throw new Error('Missing partial: \'' + name + '\'');
        }

        // Compile partial, if needed
        if (typeof template !== 'function') {
            template = handlebars.compile(template);
        }

        return template;
    }
    /**
     * 从缓存或数据中获取模板函数
     * @param  {Array}  dirs        模板目录列表
     * @param  {String} name        文件名
     * @param  {String} partialName 模板索引名
     * @return {Function}           编译执行函数
     */
    function getTemplate(dirs, name, partialName) {
        var template = handlebars.partials[partialName],
            suffix = layoutOpt.suffix || 'html',
            fileName,
            templatePath,
            fileContent;

        //增加动态渲染
        if (!template && Array.isArray(dirs) && fs && path) {
            // 增加文件名赋值
            if (/\/$/.test(name)) {
                fileName = name + '/index.' + suffix;
            }
            else {
                fileName = name + '.' + suffix;
            }
            dirs.forEach(function (dir) {
                templatePath = path.join(dir, fileName);
                if (fs.existsSync(templatePath)) {
                    template = fileContent = fs.readFileSync(templatePath, 'utf8');
                    if (layoutOpt.cache) {
                        handlebars.registerPartial(name, fileContent);
                    }
                }
            });
        }
        return compileTempl(partialName, template);
    }
    var helpers = {
        /**
         * @method extend
         * @param {String} name
         * @param {?Object} customContext
         * @param {Object} options
         * @param {Function(Object)} options.fn
         * @param {Object} options.hash
         * @return {String} Rendered partial.
         */
        extend: function (name, customContext, options) {
            // Make `customContext` optional
            if (arguments.length < 3) {
                options = customContext;
                customContext = null;
            }

            options = options || {};

            var fn = options.fn || noop,
                context = mixin({}, this, customContext, options.hash),
                data = handlebars.createFrame(options.data),
                template = getTemplate(layoutOpt.extendDir, name, name);

            // Add overrides to stack
            getStack(context).push(fn);

            // Render partial
            return template(context, { data: data });
        },

        /**
         * @method embed
         * @param {String} name
         * @param {?Object} customContext
         * @param {Object} options
         * @param {Function(Object)} options.fn
         * @param {Object} options.hash
         * @return {String} Rendered partial.
         */
        embed: function () {
            var context = mixin({}, this || {});

            // Reset context
            context.$$layoutStack = null;
            context.$$layoutActions = null;

            // Extend
            return helpers.extend.apply(context, arguments);
        },

        /**
         * @method block
         * @param {String} name
         * @param {Object} options
         * @param {Function(Object)} options.fn
         * @return {String} Modified block content.
         */
        block: function (name, options) {
            options = options || {};

            var fn = options.fn || noop,
                data = handlebars.createFrame(options.data),
                context = this || {};

            applyStack(context);

            return getActionsByName(context, name).reduce(
                applyAction.bind(context),
                fn(context, { data: data })
            );
        },

        /**
         * @method content
         * @param {String} name
         * @param {Object} options
         * @param {Function(Object)} options.fn
         * @param {Object} options.hash
         * @param {String} options.hash.mode
         * @return {String} Always empty.
         */
        content: function (name, options) {
            options = options || {};

            var fn = options.fn,
                data = handlebars.createFrame(options.data),
                hash = options.hash || {},
                mode = hash.mode || 'replace',
                context = this || {};

            applyStack(context);

            // Getter
            if (!fn) {
                return name in getActions(context);
            }

            // Setter
            getActionsByName(context, name).push({
                options: { data: data },
                mode: mode.toLowerCase(),
                fn: fn
            });
        }
    };

    return helpers;
}

/**
 * Registers layout helpers on a Handlebars instance.
 *
 * @method register
 * @param {Object} handlebars Handlebars instance.
 * @param {Object} layoutOpt layout option.
 * @return {Object} Object of helpers.
 * @static
 */
layouts.register = function (handlebars, layoutOpt) {
    var helpers = layouts(handlebars, layoutOpt);

    handlebars.registerHelper(helpers);

    return helpers;
};

module.exports = layouts;
