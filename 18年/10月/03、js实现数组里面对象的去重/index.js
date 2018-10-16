/**
 * create by yanlele
 * create time 2018-10-16 13:42
 */

var arr2 = [
    { name: "18845568888", psd: "1" },
    { name: "19999999999", psd: "11" },
    { name: "15325465456", psd: "12" },
    { name: "18845568888", psd: "13" },
    { name: "12355555555", psd: "1" },
    { name: "18845568888", psd: "1" },
    { name: "18954564654", psd: "12" }
];
function arrayUnique2(arr, name) {
    var hash = {};
    return arr.reduce(function (item, next) {
        hash[next[name]] ? '' : hash[next[name]] = true && item.push(next);
        return item;
    }, []);
}
console.log(arr2);
console.log(arrayUnique2(arr2, "name"));//根据key去重
//console.log(arrayUnique2(arr2, "psd"));