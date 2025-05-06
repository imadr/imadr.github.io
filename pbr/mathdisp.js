const greek_letters = {
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\epsilon': 'ε',
    '\\varepsilon': 'ε',
    '\\zeta': 'ζ',
    '\\eta': 'η',
    '\\theta': 'θ',
    '\\vartheta': 'ϑ',
    '\\iota': 'ι',
    '\\kappa': 'κ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\nu': 'ν',
    '\\xi': 'ξ',
    '\\pi': 'π',
    '\\varpi': 'ϖ',
    '\\rho': 'ρ',
    '\\varrho': 'ϱ',
    '\\sigma': 'σ',
    '\\varsigma': 'ς',
    '\\tau': 'τ',
    '\\upsilon': 'υ',
    '\\phi': 'φ',
    '\\varphi': 'φ',
    '\\chi': 'χ',
    '\\psi': 'ψ',
    '\\omega': 'ω',
    '\\Gamma': 'Γ',
    '\\Delta': 'Δ',
    '\\Theta': 'Θ',
    '\\Lambda': 'Λ',
    '\\Xi': 'Ξ',
    '\\Pi': 'Π',
    '\\Sigma': 'Σ',
    '\\Upsilon': 'Υ',
    '\\Phi': 'Φ',
    '\\Psi': 'Ψ',
    '\\Omega': 'Ω'
};
function parse_math_notation(math_str, nested_level = 0) {
    let result = '';
    let i = 0;

    while (i < math_str.length) {
        if (math_str[i] === '_' && math_str[i + 1] === '{') {
            let j = i + 2;
            let subscript = '';
            let bracket_count = 1;

            while (j < math_str.length && bracket_count > 0) {
                if (math_str[j] === '{') {
                    bracket_count++;
                }
                if (math_str[j] === '}') {
                    bracket_count--;
                }

                if (bracket_count > 0) {
                    subscript += math_str[j];
                }
                j++;
            }

            const nest_level = nested_level + 1;
            result += '<span class="sub level-' + nest_level + '">' + parse_math_notation(subscript, nest_level) + '</span>';
            i = j;
        } else if (math_str[i] === '^' && math_str[i + 1] === '{') {
            let j = i + 2;
            let superscript = '';
            let bracket_count = 1;

            while (j < math_str.length && bracket_count > 0) {
                if (math_str[j] === '{') {
                    bracket_count++;
                }
                if (math_str[j] === '}') {
                    bracket_count--;
                }

                if (bracket_count > 0) {
                    superscript += math_str[j];
                }
                j++;
            }

            const nest_level = nested_level + 1;
            result += '<span class="sup level-' + nest_level + '">' + parse_math_notation(superscript, nest_level) + '</span>';
            i = j;
        } else if (i + 5 < math_str.length && math_str.substring(i, i + 6) === '\\frac{') {
            let j = i + 6;
            let numerator = '';
            let bracket_count = 1;

            while (j < math_str.length && bracket_count > 0) {
                if (math_str[j] === '{') {
                    bracket_count++;
                }
                if (math_str[j] === '}') {
                    bracket_count--;
                }

                if (bracket_count > 0) {
                    numerator += math_str[j];
                }
                j++;
            }

            if (j < math_str.length && math_str[j] === '{') {
                let denominator = '';
                bracket_count = 1;
                j++;

                while (j < math_str.length && bracket_count > 0) {
                    if (math_str[j] === '{') {
                        bracket_count++;
                    }
                    if (math_str[j] === '}') {
                        bracket_count--;
                    }

                    if (bracket_count > 0) {
                        denominator += math_str[j];
                    }
                    j++;
                }

                const nest_level = nested_level + 1;
                result += '<span class="fraction level-' + nest_level + '"><span class="numerator">' + parse_math_notation(numerator, nest_level) + '</span><span class="denominator">' + parse_math_notation(denominator, nest_level) + '</span></span>';
                i = j;
            }
        } else {
            let found_greek = false;

            for (const [symbol, replacement] of Object.entries(greek_letters)) {
                if (i + symbol.length <= math_str.length &&
                    math_str.substring(i, i + symbol.length) === symbol) {
                    result += replacement;
                    i += symbol.length;
                    found_greek = true;
                    break;
                }
            }

            if (found_greek) {
                continue;
            } else if (i + 4 < math_str.length && math_str.substring(i, i + 5) === '\\cdot') {
                result += '·';
                i += 5;
            } else if (math_str[i] === '^' && i + 1 < math_str.length && math_str[i + 1] !== '{') {
                const nest_level = nested_level + 1;
                result += '<span class="sup level-' + nest_level + '">' + math_str[i + 1] + '</span>';
                i += 2;
            } else if (math_str[i] === '_' && i + 1 < math_str.length && math_str[i + 1] !== '{') {
                const nest_level = nested_level + 1;
                result += '<span class="sub level-' + nest_level + '">' + math_str[i + 1] + '</span>';
                i += 2;
            } else {
                result += math_str[i];
                i++;
            }
        }
    }

    return result;
}

function render_all_math_elements() {
    const math_elements = document.querySelectorAll('.math');

    math_elements.forEach(element => {
        const math_notation = element.getAttribute('data');
        const parsed_math = parse_math_notation(math_notation);

        element.innerHTML = parsed_math;
        element.classList.add('equation');
    });
}

window.onload = function() {
    render_all_math_elements();
};