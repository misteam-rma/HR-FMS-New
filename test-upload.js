const fetch = require('node-fetch');

async function testUpload(folderId) {
  try {
    const params = new URLSearchParams();
    params.append('action', 'uploadFile');
    params.append('base64Data', 'data:text/plain;base64,SGVsbG8gV29ybGQ=');
    params.append('fileName', 'test.txt');
    params.append('mimeType', 'text/plain');
    params.append('folderId', folderId);

    const res = await fetch('https://script.google.com/macros/s/AKfycbx2Gx6GwLbx4vROXNK6PnB9J6pU61x5cfjjaqsEYH5nWkZwQGR8p-0geF14UK7QyG3qPg/exec', {
      method: 'POST',
      body: params
    });
    
    const data = await res.json();
    console.log(`Folder ${folderId} result:`, data);
  } catch(e) {
    console.error(`Folder ${folderId} error:`, e.message);
  }
}

testUpload('11rrcY8U9f61mcXLqDaJVzEgqkwFd5l6c'); // Enquiry
testUpload('1SEpx7Z3wuI3-jQHovPfTc8svpbcOBpuA'); // After Joining
