let id = document.querySelector('#email')
let pw = document.querySelector('#pw')
let btn = document.querySelector('#signInButton')

        btn.addEventListener('click', () => {
            if(id.value == "") {
                label = id.nextElementSibling
                label.classList.add('warning')
                setTimeout(() => {
                    label.classList.remove('warning')
                }, 1500)
            } else if(pw.value == "") {
                label = pw.nextElementSibling
                label.classList.add('warning')
                setTimeout(() => {
                    label.classList.remove('warning')
                }, 1500)
            }
        });


// // 유효성검사
// function login_check() {
//     //변수에 담아주기
//     var id = document.getElementById("id");
//     var pw = document.getElementById("pw");

//     if (id.value == "") { //해당 입력값이 없을 경우 같은말: if(!uid.value)
//         alert("아이디를 입력하세요.");
//         id.focus(); //focus(): 커서가 깜빡이는 현상, blur(): 커서가 사라지는 현상
//         return false; //return: 반환하다 return false:  아무것도 반환하지 말아라 아래 코드부터 아무것도 진행하지 말것
//     };

//     if (pw.value == "") {
//         alert("비밀번호를 입력하세요.");
//         pw.focus();
//         return false;
//       };

// //입력 값 전송
// document.join_form.submit(); //유효성 검사의 포인트  
// };