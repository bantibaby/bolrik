// let currentPage = 1;

// async function fetchResults(page) {
//     try {
//         const response = await fetch(`/user/getResults?page=${page}`);
//         const results = await response.json();
//         displayResults(results);
//     } catch (error) {
//         console.error("Error fetching results:", error);
//     }
// }

// function displayResults(results) {
//     const container = document.querySelector('.result-main-container');
//     container.innerHTML = ''; // पहले के results हटाएं

//     results.forEach(result => {
//         const resultDiv = document.createElement('div');
//         resultDiv.classList.add('result-container');
//         resultDiv.innerHTML = `
//             <div class="result-data-id">
//                 <p class="result-id">Trade No. ${result.resultNo}</p>
//                 <p class="result-id">Trade-ID: ${result.resultId}</p>
//             </div>
//             <div class="result-data-values">
//                 <table class="result-trade-table">
//                     <tr class="result-table-head">
//                         <th class="result-table-heading">1</th>
//                         <th class="result-table-heading">2</th>
//                         <th class="result-table-heading">3</th>
//                         <th class="result-table-heading">4</th>
//                         <th class="result-table-heading">5</th>
//                         <th class="result-table-heading">6</th>
//                         <th class="result-table-heading">7</th>
//                         <th class="result-table-heading">8</th>
//                         <th class="result-table-heading">9</th>
//                     </tr>
//                     <tr class="result-table-data">
//                         ${result.values.map(value => `<td class="result-values">${value}</td>`).join('')}
//                     </tr>
//                 </table>
//             </div>
//         `;
//         container.appendChild(resultDiv);
//     });
// }

// // Pagination Controls
// document.querySelector('#nextBtn').addEventListener('click', () => {
//     currentPage++;
//     fetchResults(currentPage);
// });

// document.querySelector('#prevBtn').addEventListener('click', () => {
//     if (currentPage > 1) {
//         currentPage--;
//         fetchResults(currentPage);
//     }
// });

// // जब पेज लोड हो, पहले 10 results दिखाएं
// document.addEventListener("DOMContentLoaded", () => fetchResults(1));
